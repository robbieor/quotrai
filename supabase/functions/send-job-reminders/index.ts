import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // ──────────────────────────────────────────────────────────
  // COMMUNICATION SAFETY: Global kill switch — blocks ALL automated job reminders
  // ──────────────────────────────────────────────────────────
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
      .select(`
        *,
        job:jobs(title, scheduled_date, scheduled_time, description),
        customer:customers(name, email, phone)
      `)
      .eq("sent", false)
      .lte("remind_at", new Date().toISOString())
      .limit(50);

    if (fetchError) throw fetchError;
    if (!reminders || reminders.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    let sentCount = 0;

    for (const reminder of reminders) {
      const customerEmail = reminder.customer?.email;
      if (!customerEmail) continue;

      const jobTitle = reminder.job?.title || "Upcoming appointment";
      const scheduledDate = reminder.job?.scheduled_date || "TBD";
      const scheduledTime = reminder.job?.scheduled_time || "";

      if (RESEND_API_KEY && reminder.reminder_type === "email") {
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: "Quotr <noreply@quotr.info>",
              to: [customerEmail],
              subject: `Appointment Reminder: ${jobTitle}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #333;">Appointment Reminder</h2>
                  <p>Hi ${reminder.customer?.name || "there"},</p>
                  <p>This is a friendly reminder about your upcoming appointment:</p>
                  <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
                    <p style="margin: 4px 0;"><strong>Job:</strong> ${jobTitle}</p>
                    <p style="margin: 4px 0;"><strong>Date:</strong> ${scheduledDate}</p>
                    ${scheduledTime ? `<p style="margin: 4px 0;"><strong>Time:</strong> ${scheduledTime}</p>` : ""}
                    ${reminder.job?.description ? `<p style="margin: 4px 0;"><strong>Details:</strong> ${reminder.job.description}</p>` : ""}
                  </div>
                  <p>If you need to reschedule, please contact us.</p>
                </div>
              `,
            }),
          });

          // Audit log
          await supabase.from("comms_audit_log").insert({
            channel: "email",
            record_type: "job_reminder",
            record_id: reminder.id,
            recipient: customerEmail,
            template: "send-job-reminders",
            manual_send: false,
            confirmed_by_user: false,
            allowed: true,
            source_screen: "cron",
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

    return new Response(JSON.stringify({ sent: sentCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
