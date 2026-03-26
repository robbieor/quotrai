import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SENDER_DOMAIN = "notify.quotr.work";
const FROM_DOMAIN = "quotr.work";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const outboundEnabled = Deno.env.get("OUTBOUND_COMMUNICATION_ENABLED") === "true";
  if (!outboundEnabled) {
    console.log("[SAFETY] send-job-reminders blocked: OUTBOUND_COMMUNICATION_ENABLED is false");
    return new Response(JSON.stringify({ sent: 0, blocked: true, reason: "kill_switch" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: reminders, error: fetchError } = await supabase
      .from("job_reminders")
      .select(`*, job:jobs(title, scheduled_date, scheduled_time, description), customer:customers(name, email, phone)`)
      .eq("sent", false)
      .lte("remind_at", new Date().toISOString())
      .limit(50);

    if (fetchError) throw fetchError;
    if (!reminders || reminders.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Pre-fetch all team comms_settings to check per-team opt-in AND confirmation gate
    const teamIds = [...new Set(reminders.map((r: any) => r.team_id))];
    const { data: allCommsSettings } = await supabase
      .from("comms_settings")
      .select("team_id, visit_reminder_enabled, require_confirmation_all_comms")
      .in("team_id", teamIds);
    const commsMap = new Map((allCommsSettings || []).map((s: any) => [s.team_id, s]));

    let sentCount = 0;
    let skippedConfirmation = 0;

    for (const reminder of reminders) {
      const teamComms = commsMap.get(reminder.team_id);

      // SAFETY: Check team-level opt-in for visit reminders
      if (!teamComms || !teamComms.visit_reminder_enabled) {
        console.log(`[SAFETY] Skipping job reminder ${reminder.id}: team visit_reminder_enabled is false or missing`);
        continue;
      }

      // SAFETY: Check require_confirmation_all_comms gate
      if (teamComms.require_confirmation_all_comms) {
        console.log(`[SAFETY] Skipping job reminder ${reminder.id}: require_confirmation_all_comms is ON`);
        await supabase.from("comms_audit_log").insert({
          channel: "email", record_type: "job_reminder", record_id: reminder.id,
          recipient: reminder.customer?.email || null,
          template: "send-job-reminders",
          manual_send: false, confirmed_by_user: false,
          allowed: false, blocked_reason: "requires_ui_confirmation",
          source_screen: "cron",
        });
        skippedConfirmation++;
        continue;
      }

      const customerEmail = reminder.customer?.email;
      if (!customerEmail) continue;

      const jobTitle = reminder.job?.title || "Upcoming appointment";
      const scheduledDate = reminder.job?.scheduled_date || "TBD";
      const scheduledTime = reminder.job?.scheduled_time || "";

      if (reminder.reminder_type === "email") {
        try {
          const messageId = crypto.randomUUID();
          const html = `
            <div style="font-family: 'Manrope', -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #0f172a;">Appointment Reminder</h2>
              <p>Hi ${reminder.customer?.name || "there"},</p>
              <p>This is a friendly reminder about your upcoming appointment:</p>
              <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <p style="margin: 4px 0;"><strong>Job:</strong> ${jobTitle}</p>
                <p style="margin: 4px 0;"><strong>Date:</strong> ${scheduledDate}</p>
                ${scheduledTime ? `<p style="margin: 4px 0;"><strong>Time:</strong> ${scheduledTime}</p>` : ""}
                ${reminder.job?.description ? `<p style="margin: 4px 0;"><strong>Details:</strong> ${reminder.job.description}</p>` : ""}
              </div>
              <p>If you need to reschedule, please contact us.</p>
            </div>
          `;

          await supabase.from("email_send_log").insert({
            message_id: messageId, template_name: "job-reminder",
            recipient_email: customerEmail, status: "pending",
          });

          const { error: enqueueError } = await supabase.rpc("enqueue_email", {
            queue_name: "transactional_emails",
            payload: {
              message_id: messageId,
              to: customerEmail,
              from: `Foreman <noreply@${FROM_DOMAIN}>`,
              sender_domain: SENDER_DOMAIN,
              subject: `Appointment Reminder: ${jobTitle}`,
              html,
              text: `Appointment Reminder: ${jobTitle} on ${scheduledDate}${scheduledTime ? ` at ${scheduledTime}` : ""}`,
              purpose: "transactional",
              label: "job-reminder",
              queued_at: new Date().toISOString(),
            },
          });

          if (enqueueError) throw enqueueError;

          await supabase.from("comms_audit_log").insert({
            channel: "email", record_type: "job_reminder", record_id: reminder.id,
            recipient: customerEmail, template: "send-job-reminders",
            manual_send: false, confirmed_by_user: false,
            allowed: true, source_screen: "cron",
          });

          sentCount++;
        } catch (e) {
          console.error("Failed to send reminder email:", e);
          continue;
        }
      }

      await supabase
        .from("job_reminders")
        .update({ sent: true, sent_at: new Date().toISOString() })
        .eq("id", reminder.id);
    }

    return new Response(JSON.stringify({ sent: sentCount, skipped_confirmation_required: skippedConfirmation }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
