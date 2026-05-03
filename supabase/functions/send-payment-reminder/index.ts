import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

import { EMAIL_FROM_DOMAIN as FROM_DOMAIN, EMAIL_SENDER_DOMAIN as SENDER_DOMAIN } from "../_shared/email-config.ts";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const outboundEnabled = Deno.env.get("OUTBOUND_COMMUNICATION_ENABLED") === "true";
  if (!outboundEnabled) {
    console.log("[SAFETY] send-payment-reminder blocked: OUTBOUND_COMMUNICATION_ENABLED is false");
    return new Response(JSON.stringify({ sent: 0, blocked: true, reason: "kill_switch" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const today = new Date().toISOString().split('T')[0];
    const results = { sent: 0, skipped: 0, skipped_disabled: 0, skipped_confirmation_required: 0 };

    const { data: overdueInvoices } = await supabase
      .from('invoices')
      .select('id, display_number, total, due_date, team_id, portal_token, communication_suppressed, customer:customers(name, email)')
      .in('status', ['pending', 'overdue'])
      .lt('due_date', today);

    // Pre-fetch all team comms_settings to check per-team opt-in AND confirmation gate
    const teamIds = [...new Set((overdueInvoices || []).map((i: any) => i.team_id))];
    const { data: allCommsSettings } = await supabase
      .from('comms_settings')
      .select('team_id, invoice_reminder_enabled, require_confirmation_all_comms')
      .in('team_id', teamIds);
    const commsMap = new Map((allCommsSettings || []).map((s: any) => [s.team_id, s]));

    for (const inv of (overdueInvoices || [])) {
      const teamComms = commsMap.get(inv.team_id);

      // SAFETY: Check team-level opt-in for invoice reminders
      if (!teamComms || !teamComms.invoice_reminder_enabled) {
        console.log(`[SAFETY] Skipping reminder for ${inv.display_number}: team invoice_reminder_enabled is false or missing`);
        results.skipped_disabled++;
        continue;
      }

      // SAFETY: Check require_confirmation_all_comms gate
      if (teamComms.require_confirmation_all_comms) {
        console.log(`[SAFETY] Skipping reminder for ${inv.display_number}: require_confirmation_all_comms is ON`);
        await supabase.from("comms_audit_log").insert({
          channel: "email", record_type: "invoice", record_id: inv.id,
          recipient: (inv.customer as any)?.email || null,
          template: "send-payment-reminder",
          manual_send: false, confirmed_by_user: false,
          allowed: false, blocked_reason: "requires_ui_confirmation",
          source_screen: "cron",
        });
        results.skipped_confirmation_required++;
        continue;
      }

      if (inv.communication_suppressed) {
        console.log(`[SAFETY] Skipping reminder for ${inv.display_number}: communication_suppressed`);
        results.skipped++;
        continue;
      }

      const customer = inv.customer as any;
      if (!customer?.email) { results.skipped++; continue; }

      const daysOverdue = Math.ceil(
        (Date.now() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24)
      );

      let reminderType = 'overdue';
      if (daysOverdue >= 30) reminderType = 'final';

      const { count } = await supabase
        .from('payment_reminders')
        .select('*', { count: 'exact', head: true })
        .eq('invoice_id', inv.id)
        .eq('reminder_type', reminderType)
        .gte('sent_at', `${today}T00:00:00Z`);

      if (count && count > 0) { results.skipped++; continue; }

      const { count: totalReminders } = await supabase
        .from('payment_reminders')
        .select('*', { count: 'exact', head: true })
        .eq('invoice_id', inv.id);

      if (totalReminders && totalReminders >= 5) { results.skipped++; continue; }

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
        ? `Final reminder: Invoice ${inv.display_number} is ${daysOverdue} days overdue`
        : `Payment reminder: Invoice ${inv.display_number} is overdue`;

      const urgencyText = reminderType === 'final'
        ? `This is a final reminder. Invoice ${inv.display_number} is now <strong>${daysOverdue} days overdue</strong>. Please arrange payment immediately to avoid any further action.`
        : `This is a friendly reminder that invoice ${inv.display_number} is <strong>${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} past due</strong>. Please arrange payment at your earliest convenience.`;

      try {
        const messageId = crypto.randomUUID();
        const html = `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
          <body style="font-family: 'Manrope', -apple-system, sans-serif; background: #f8fafc; margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto;">
              <div style="background: #0f172a; padding: 30px 20px; text-align: center; border-radius: 12px 12px 0 0;">
                <img src="https://revamo.ai/foreman-logo.png" alt="revamo" width="140" style="display:block;margin:0 auto;" />
                <h1 style="color: #ffffff; margin: 10px 0 0; font-size: 20px;">Payment Reminder</h1>
              </div>
              <div style="background: #fff; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
                <p>Dear ${customer.name},</p>
                <p>${urgencyText}</p>
                <div style="text-align: center; margin: 20px 0;">
                  <span style="font-size: 36px; font-weight: 700; color: #ef4444;">€${Number(inv.total).toFixed(2)}</span>
                </div>
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 5px 0;"><strong>Invoice:</strong> ${inv.display_number}</p>
                  <p style="margin: 5px 0;"><strong>Due Date:</strong> ${inv.due_date}</p>
                  <p style="margin: 5px 0; color: #ef4444;"><strong>Days Overdue:</strong> ${daysOverdue}</p>
                </div>
                ${portalUrl ? `
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${portalUrl}" style="display: inline-block; padding: 16px 40px; background: #00E6A0; color: #0f172a; font-weight: 700; font-size: 16px; text-decoration: none; border-radius: 8px;">
                    💳 Pay Now
                  </a>
                </div>` : ''}
                <p>Thank you,<br><strong>${fromName}</strong></p>
              </div>
              <div style="text-align: center; padding: 15px; color: #64748b; font-size: 12px;">
                Powered by <a href="#" style="color: #00E6A0;">revamo</a>
              </div>
            </div>
          </body>
          </html>
        `;

        await supabase.from("email_send_log").insert({
          message_id: messageId, template_name: `payment-reminder:${reminderType}`,
          recipient_email: customer.email, status: "pending",
        });

        const { error: enqueueError } = await supabase.rpc("enqueue_email", {
          queue_name: "transactional_emails",
          payload: {
            message_id: messageId,
            to: customer.email,
            from: `${fromName} via revamo <support@${FROM_DOMAIN}>`,
            sender_domain: SENDER_DOMAIN,
            subject, html,
            text: `Payment reminder for invoice ${inv.display_number} - €${Number(inv.total).toFixed(2)} overdue by ${daysOverdue} days`,
            purpose: "transactional",
            label: `payment-reminder:${reminderType}`,
            queued_at: new Date().toISOString(),
          },
        });

        if (enqueueError) throw enqueueError;

        await supabase.from('payment_reminders').insert({
          team_id: inv.team_id, invoice_id: inv.id,
          reminder_number: (totalReminders || 0) + 1, reminder_type: reminderType,
        });

        await supabase.from("comms_audit_log").insert({
          channel: "email", record_type: "invoice", record_id: inv.id,
          recipient: customer.email, template: `send-payment-reminder:${reminderType}`,
          manual_send: false, confirmed_by_user: false,
          allowed: true, source_screen: "cron",
        });

        results.sent++;
      } catch (emailErr) {
        console.error(`Failed to send reminder for ${inv.display_number}:`, emailErr);
        results.skipped++;
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
