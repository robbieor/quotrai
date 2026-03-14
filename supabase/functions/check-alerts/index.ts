import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { team_id } = await req.json();
    if (!team_id) throw new Error('team_id required');

    const results = { created: 0, types: [] as string[] };
    const today = new Date().toISOString().split('T')[0];

    // --- 1. Overdue Invoice Alerts ---
    const { data: overdueInvoices } = await supabase
      .from('invoices')
      .select('id, invoice_number, total, due_date, customer_id, customers(name)')
      .eq('team_id', team_id)
      .eq('status', 'pending')
      .lt('due_date', today);

    for (const inv of (overdueInvoices || [])) {
      // Check if we already alerted for this invoice today
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', team_id)
        .eq('type', 'invoice_overdue')
        .like('message', `%${inv.invoice_number}%`)
        .gte('created_at', `${today}T00:00:00Z`);

      if (!count || count === 0) {
        const customerName = (inv as any).customers?.name || 'Unknown';
        const daysOverdue = Math.ceil((Date.now() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24));

        await supabase.from('notifications').insert({
          team_id,
          type: 'invoice_overdue',
          title: `Invoice ${inv.invoice_number} is overdue`,
          message: `${customerName} owes €${Number(inv.total).toFixed(2)} — ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} past due.`,
          link: '/invoices',
        });
        results.created++;
        if (!results.types.includes('invoice_overdue')) results.types.push('invoice_overdue');
      }
    }

    // --- 2. Lead Follow-Up Reminders ---
    const { data: followUpLeads } = await supabase
      .from('leads')
      .select('id, name, phone, follow_up_date, status')
      .eq('team_id', team_id)
      .lte('follow_up_date', today)
      .not('status', 'in', '("won","lost")');

    for (const lead of (followUpLeads || [])) {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', team_id)
        .eq('type', 'lead_follow_up')
        .like('message', `%${lead.name}%`)
        .gte('created_at', `${today}T00:00:00Z`);

      if (!count || count === 0) {
        const isOverdue = lead.follow_up_date < today;
        await supabase.from('notifications').insert({
          team_id,
          type: 'lead_follow_up',
          title: isOverdue ? `Overdue follow-up: ${lead.name}` : `Follow up with ${lead.name} today`,
          message: `Lead "${lead.name}" ${isOverdue ? 'was due for follow-up on' : 'needs follow-up today —'} ${lead.follow_up_date}.${lead.phone ? ` Call: ${lead.phone}` : ''}`,
          link: '/leads',
        });
        results.created++;
        if (!results.types.includes('lead_follow_up')) results.types.push('lead_follow_up');
      }
    }

    // --- 3. Overdue invoice status auto-update ---
    if (overdueInvoices && overdueInvoices.length > 0) {
      const overdueIds = overdueInvoices.map((inv) => inv.id);
      await supabase
        .from('invoices')
        .update({ status: 'overdue' })
        .in('id', overdueIds)
        .eq('status', 'pending');
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
