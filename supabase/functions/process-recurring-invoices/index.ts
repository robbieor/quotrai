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

    const today = new Date().toISOString().split('T')[0];
    const results = { generated: 0, errors: 0 };

    // Find all active recurring invoices due today or earlier
    const { data: dueSchedules, error: fetchError } = await supabase
      .from('recurring_invoices')
      .select('*, recurring_invoice_items(*)')
      .eq('is_active', true)
      .lte('next_run_date', today);

    if (fetchError) throw fetchError;

    for (const schedule of (dueSchedules || [])) {
      try {
        // Get current invoice count for numbering
        const { count } = await supabase
          .from('invoices')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', schedule.team_id);

        const invoiceNumber = `INV-${String((count || 0) + 1).padStart(4, '0')}`;

        // Calculate totals
        const subtotal = (schedule.recurring_invoice_items || []).reduce(
          (sum: number, item: any) => sum + Number(item.quantity) * Number(item.unit_price), 0
        );
        const taxRate = Number(schedule.tax_rate) || 0;
        const taxAmount = subtotal * (taxRate / 100);
        const total = subtotal + taxAmount;

        // Calculate due date (30 days from now)
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);

        // Create the invoice
        // COMMUNICATION SAFETY: Auto-generated invoices are always suppressed
        const { data: newInvoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert({
            team_id: schedule.team_id,
            customer_id: schedule.customer_id,
            invoice_number: invoiceNumber,
            status: 'draft',
            issue_date: today,
            due_date: dueDate.toISOString().split('T')[0],
            subtotal,
            tax_rate: taxRate,
            tax_amount: taxAmount,
            total,
            notes: schedule.notes,
            communication_suppressed: true,
            delivery_status: "not_sent",
          })
          .select()
          .single();

        if (invoiceError) throw invoiceError;

        // Copy line items
        if (schedule.recurring_invoice_items?.length > 0) {
          const invoiceItems = schedule.recurring_invoice_items.map((item: any) => ({
            invoice_id: newInvoice.id,
            description: item.description,
            quantity: Number(item.quantity),
            unit_price: Number(item.unit_price),
            total_price: Number(item.quantity) * Number(item.unit_price),
          }));

          await supabase.from('invoice_items').insert(invoiceItems);
        }

        // Calculate next run date
        const nextDate = new Date(schedule.next_run_date);
        switch (schedule.frequency) {
          case 'weekly': nextDate.setDate(nextDate.getDate() + 7); break;
          case 'fortnightly': nextDate.setDate(nextDate.getDate() + 14); break;
          case 'monthly': nextDate.setMonth(nextDate.getMonth() + 1); break;
          case 'quarterly': nextDate.setMonth(nextDate.getMonth() + 3); break;
          case 'yearly': nextDate.setFullYear(nextDate.getFullYear() + 1); break;
        }

        // Update schedule with next run date
        await supabase
          .from('recurring_invoices')
          .update({
            last_run_date: today,
            next_run_date: nextDate.toISOString().split('T')[0],
          })
          .eq('id', schedule.id);

        // Create notification
        const { data: customer } = await supabase
          .from('customers')
          .select('name')
          .eq('id', schedule.customer_id)
          .single();

        await supabase.from('notifications').insert({
          team_id: schedule.team_id,
          type: 'invoice_sent',
          title: `Recurring invoice ${invoiceNumber} generated`,
          message: `Auto-generated invoice for ${customer?.name || 'Unknown'} — €${total.toFixed(2)}`,
          link: '/invoices',
        });

        results.generated++;
      } catch (err) {
        console.error(`Error processing schedule ${schedule.id}:`, err);
        results.errors++;
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
