import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function getValidToken(supabase: any, teamId: string): Promise<{ accessToken: string; tenantId: string }> {
  const { data: conn, error } = await supabase
    .from('xero_connections')
    .select('*')
    .eq('team_id', teamId)
    .single();

  if (error || !conn) throw new Error('No Xero connection found');

  // Check if token is expired (with 5 min buffer)
  const expiresAt = new Date(conn.token_expires_at);
  if (expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
    // Refresh
    const clientId = Deno.env.get('XERO_CLIENT_ID')!;
    const clientSecret = Deno.env.get('XERO_CLIENT_SECRET')!;

    const tokenRes = await fetch('https://identity.xero.com/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: conn.refresh_token,
      }),
    });

    if (!tokenRes.ok) throw new Error('Token refresh failed');
    const tokens = await tokenRes.json();

    await supabase.from('xero_connections').update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', conn.id);

    return { accessToken: tokens.access_token, tenantId: conn.xero_tenant_id };
  }

  return { accessToken: conn.access_token, tenantId: conn.xero_tenant_id };
}

async function syncContactToXero(accessToken: string, tenantId: string, customer: any) {
  const body = {
    Contacts: [{
      Name: customer.name,
      EmailAddress: customer.email || undefined,
      Phones: customer.phone ? [{ PhoneType: "DEFAULT", PhoneNumber: customer.phone }] : [],
      Addresses: customer.address ? [{
        AddressType: "STREET",
        AddressLine1: customer.address,
        Country: customer.country_code || undefined,
      }] : [],
      ContactNumber: `QTR-${customer.client_number}`,
    }],
  };

  const res = await fetch('https://api.xero.com/api.xro/2.0/Contacts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'xero-tenant-id': tenantId,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Contact sync failed [${res.status}]: ${err}`);
  }

  const data = await res.json();
  return data.Contacts?.[0];
}

async function syncInvoiceToXero(accessToken: string, tenantId: string, invoice: any, items: any[], customerName: string) {
  const lineItems = items.map(item => ({
    Description: item.description,
    Quantity: Number(item.quantity),
    UnitAmount: Number(item.unit_price),
    AccountCode: "200", // Default sales account
  }));

  const body = {
    Invoices: [{
      Type: "ACCREC",
      Contact: { Name: customerName },
      Date: invoice.issue_date,
      DueDate: invoice.due_date,
      LineItems: lineItems,
      Reference: invoice.display_number,
      Status: invoice.status === 'sent' ? 'AUTHORISED' : 'DRAFT',
      LineAmountTypes: invoice.tax_rate > 0 ? 'Exclusive' : 'NoTax',
    }],
  };

  const res = await fetch('https://api.xero.com/api.xro/2.0/Invoices', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'xero-tenant-id': tenantId,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Invoice sync failed [${res.status}]: ${err}`);
  }

  const data = await res.json();
  return data.Invoices?.[0];
}

async function syncPaymentToXero(accessToken: string, tenantId: string, payment: any, invoiceRef: string) {
  const body = {
    Payments: [{
      Invoice: { InvoiceNumber: invoiceRef },
      Account: { Code: "090" }, // Default bank account
      Date: payment.payment_date,
      Amount: Number(payment.amount),
      Reference: `Payment ${payment.id.slice(0, 8)}`,
    }],
  };

  const res = await fetch('https://api.xero.com/api.xro/2.0/Payments', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'xero-tenant-id': tenantId,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Payment sync failed [${res.status}]: ${err}`);
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

    const { accessToken, tenantId } = await getValidToken(supabase, team_id);
    const results: any = { synced: [], errors: [] };

    if (sync_type === 'contact' || sync_type === 'all') {
      const query = supabase.from('customers').select('*').eq('team_id', team_id);
      if (entity_id) query.eq('id', entity_id);
      const { data: customers } = await query;

      for (const customer of (customers || [])) {
        try {
          await syncContactToXero(accessToken, tenantId, customer);
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
          await syncInvoiceToXero(accessToken, tenantId, inv, inv.invoice_items || [], inv.customers?.name || 'Unknown');
          results.synced.push({ type: 'invoice', id: inv.id, number: inv.display_number });
        } catch (e: any) {
          results.errors.push({ type: 'invoice', id: inv.id, error: e.message });
        }
      }
    }

    if (sync_type === 'payment' && entity_id) {
      const { data: payment } = await supabase
        .from('payments')
        .select('*, invoices(display_number)')
        .eq('id', entity_id)
        .single();

      if (payment) {
        try {
          await syncPaymentToXero(accessToken, tenantId, payment, payment.invoices?.display_number || '');
          results.synced.push({ type: 'payment', id: payment.id });
        } catch (e: any) {
          results.errors.push({ type: 'payment', id: payment.id, error: e.message });
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
