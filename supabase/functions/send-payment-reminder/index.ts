import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

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
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (!resendApiKey) throw new Error('RESEND_API_KEY not configured');
    
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const resend = new Resend(resendApiKey);
    const today = new Date().toISOString().split('T')[0];
    const results = { sent: 0, skipped: 0 };

    // Find overdue invoices with customer email
    const { data: overdueInvoices } = await supabase
      .from('invoices')
      .select('id, invoice_number, total, due_date, team_id, portal_token, customer:customers(name, email)')
      .in('status', ['pending', 'overdue'])
      .lt('due_date', today);

    for (const inv of (overdueInvoices || [])) {
      const customer = inv.customer as any;
      if (!customer?.email) { results.skipped++; continue; }

      const daysOverdue = Math.ceil(
        (Date.now() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Determine reminder type based on days overdue
      let reminderType = 'overdue';
      if (daysOverdue >= 30) reminderType = 'final';

      // Check if we already sent this reminder type today
      const { count } = await supabase
        .from('payment_reminders')
        .select('*', { count: 'exact', head: true })
        .eq('invoice_id', inv.id)
        .eq('reminder_type', reminderType)
        .gte('sent_at', `${today}T00:00:00Z`);

      if (count && count > 0) { results.skipped++; continue; }

      // Check max reminders (don't send more than 5 total per invoice)
      const { count: totalReminders } = await supabase
        .from('payment_reminders')
        .select('*', { count: 'exact', head: true })
        .eq('invoice_id', inv.id);

      if (totalReminders && totalReminders >= 5) { results.skipped++; continue; }

      // Get company branding for from name
      const { data: branding } = await supabase
        .from('company_branding')
        .select('company_name')
        .eq('team_id', inv.team_id)
        .maybeSingle();

      const fromName = branding?.company_name || 'Your Service Provider';
      const portalUrl = inv.portal_token 
        ? `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/portal/invoice?token=${inv.portal_token}`
        : null;

      const subject = reminderType === 'final'
        ? `Final reminder: Invoice ${inv.invoice_number} is ${daysOverdue} days overdue`
        : `Payment reminder: Invoice ${inv.invoice_number} is overdue`;

      const urgencyText = reminderType === 'final'
        ? `This is a final reminder. Invoice ${inv.invoice_number} is now <strong>${daysOverdue} days overdue</strong>. Please arrange payment immediately to avoid any further action.`
        : `This is a friendly reminder that invoice ${inv.invoice_number} is <strong>${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} past due</strong>. Please arrange payment at your earliest convenience.`;

      try {
        await resend.emails.send({
          from: `${fromName} via Quotr <noreply@quotr.info>`,
          to: [customer.email],
          subject,
          html: `
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
            <body style="font-family: 'Manrope', -apple-system, sans-serif; background: #f8fafc; margin: 0; padding: 20px;">
              <div style="max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #00FFB2, #00D4FF); padding: 30px 20px; text-align: center; border-radius: 12px 12px 0 0;">
                  <div style="font-size: 28px; font-weight: 700; color: #0f172a;">Quotr</div>
                  <h1 style="color: #0f172a; margin: 10px 0 0; font-size: 20px;">Payment Reminder</h1>
                </div>
                <div style="background: #fff; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
                  <p>Dear ${customer.name},</p>
                  <p>${urgencyText}</p>
                  <div style="text-align: center; margin: 20px 0;">
                    <span style="font-size: 36px; font-weight: 700; color: #ef4444;">€${Number(inv.total).toFixed(2)}</span>
                  </div>
                  <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Invoice:</strong> ${inv.invoice_number}</p>
                    <p style="margin: 5px 0;"><strong>Due Date:</strong> ${inv.due_date}</p>
                    <p style="margin: 5px 0; color: #ef4444;"><strong>Days Overdue:</strong> ${daysOverdue}</p>
                  </div>
                  ${portalUrl ? `
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${portalUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #00FFB2, #00D4FF); color: #0f172a; font-weight: 700; font-size: 16px; text-decoration: none; border-radius: 8px;">
                      💳 Pay Now
                    </a>
                  </div>
                  ` : ''}
                  <p>Thank you,<br><strong>${fromName}</strong></p>
                </div>
                <div style="text-align: center; padding: 15px; color: #64748b; font-size: 12px;">
                  Powered by <a href="#" style="color: #00D4FF;">Quotr</a>
                </div>
              </div>
            </body>
            </html>
          `,
        });

        // Log the reminder
        await supabase.from('payment_reminders').insert({
          team_id: inv.team_id,
          invoice_id: inv.id,
          reminder_number: (totalReminders || 0) + 1,
          reminder_type: reminderType,
        });

        results.sent++;
      } catch (emailErr) {
        console.error(`Failed to send reminder for ${inv.invoice_number}:`, emailErr);
        results.skipped++;
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
