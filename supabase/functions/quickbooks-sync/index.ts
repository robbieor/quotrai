import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function getValidToken(supabase: any, teamId: string) {
  const { data: conn, error } = await supabase
    .from('quickbooks_connections')
    .select('*')
    .eq('team_id', teamId)
    .single();

  if (error || !conn) throw new Error('No QuickBooks connection found');

  const expiresAt = new Date(conn.token_expires_at);
  if (expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
    const clientId = Deno.env.get('QUICKBOOKS_CLIENT_ID')!;
    const clientSecret = Deno.env.get('QUICKBOOKS_CLIENT_SECRET')!;

    const tokenRes = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: conn.refresh_token,
      }),
    });

    if (!tokenRes.ok) throw new Error('Token refresh failed');
    const tokens = await tokenRes.json();

    await supabase.from('quickbooks_connections').update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', conn.id);

    return { accessToken: tokens.access_token, realmId: conn.realm_id };
  }

  return { accessToken: conn.access_token, realmId: conn.realm_id };
}

async function syncCustomerToQB(accessToken: string, realmId: string, customer: any) {
  const body = {
    DisplayName: customer.name,
    PrimaryEmailAddr: customer.email ? { Address: customer.email } : undefined,
    PrimaryPhone: customer.phone ? { FreeFormNumber: customer.phone } : undefined,
    BillAddr: customer.address ? { Line1: customer.address } : undefined,
  };

  const res = await fetch(`https://quickbooks.api.intuit.com/v3/company/${realmId}/customer?minorversion=65`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Customer sync failed [${res.status}]: ${err}`);
  }
  return await res.json();
}

async function syncInvoiceToQB(accessToken: string, realmId: string, invoice: any, items: any[], customerName: string) {
  const lineItems = items.map((item, idx) => ({
    DetailType: 'SalesItemLineDetail',
    Amount: Number(item.quantity) * Number(item.unit_price),
    Description: item.description,
    SalesItemLineDetail: {
      Qty: Number(item.quantity),
      UnitPrice: Number(item.unit_price),
    },
    LineNum: idx + 1,
  }));

  const body = {
    CustomerRef: { name: customerName },
    Line: lineItems,
    DueDate: invoice.due_date,
    TxnDate: invoice.issue_date,
    DocNumber: invoice.display_number,
  };

  const res = await fetch(`https://quickbooks.api.intuit.com/v3/company/${realmId}/invoice?minorversion=65`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Invoice sync failed [${res.status}]: ${err}`);
  }
  return await res.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { team_id, sync_type, entity_id } = await req.json();
    if (!team_id) throw new Error('team_id required');

    const { accessToken, realmId } = await getValidToken(supabase, team_id);
    const results: any = { synced: [], errors: [] };

    if (sync_type === 'contact' || sync_type === 'all') {
      const query = supabase.from('customers').select('*').eq('team_id', team_id);
      if (entity_id) query.eq('id', entity_id);
      const { data: customers } = await query;

      for (const customer of (customers || [])) {
        try {
          await syncCustomerToQB(accessToken, realmId, customer);
          results.synced.push({ type: 'contact', id: customer.id, name: customer.name });
        } catch (e: any) {
          results.errors.push({ type: 'contact', id: customer.id, error: e.message });
        }
      }
    }

    if (sync_type === 'invoice' || sync_type === 'all') {
      const query = supabase.from('invoices').select('*, customers(name), invoice_items(*)').eq('team_id', team_id);
      if (entity_id) query.eq('id', entity_id);
      const { data: invoices } = await query;

      for (const inv of (invoices || [])) {
        try {
          await syncInvoiceToQB(accessToken, realmId, inv, inv.invoice_items || [], inv.customers?.name || 'Unknown');
          results.synced.push({ type: 'invoice', id: inv.id, number: inv.display_number });
        } catch (e: any) {
          results.errors.push({ type: 'invoice', id: inv.id, error: e.message });
        }
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
