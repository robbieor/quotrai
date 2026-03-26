import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SENDER_DOMAIN = "notify.quotr.work";
const FROM_DOMAIN = "quotr.work";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const outboundEnabled = Deno.env.get("OUTBOUND_COMMUNICATION_ENABLED") === "true";
  if (!outboundEnabled) return new Response(JSON.stringify({ sent: 0, blocked: true, reason: "kill_switch" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const { data: profiles, error: profileError } = await supabase.from("profiles").select("id, email, full_name, team_id, updated_at").not("email", "is", null).lt("updated_at", sevenDaysAgo).limit(50);
    if (profileError) throw profileError;
    if (!profiles || profiles.length === 0) return new Response(JSON.stringify({ processed: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    let sentCount = 0;
    let skippedSuppressed = 0;

    for (const profile of profiles) {
      if (!profile.email || !profile.team_id) continue;

      // SAFETY: Check suppression list before sending
      const { data: suppressed } = await supabase.from("suppressed_emails").select("id").eq("email", profile.email).limit(1);
      if (suppressed && suppressed.length > 0) {
        console.log(`[SAFETY] Skipping churn email for ${profile.email}: address is suppressed`);
        skippedSuppressed++;
        continue;
      }

      const { data: recentChurn } = await supabase.from("churn_events").select("id").eq("user_id", profile.id).gte("created_at", fourteenDaysAgo).limit(1);
      if (recentChurn && recentChurn.length > 0) continue;

      const { count: jobCount } = await supabase.from("jobs").select("*", { count: "exact", head: true }).eq("team_id", profile.team_id).gte("created_at", sevenDaysAgo);
      const { count: invoiceCount } = await supabase.from("invoices").select("*", { count: "exact", head: true }).eq("team_id", profile.team_id).gte("created_at", sevenDaysAgo);
      if ((jobCount || 0) > 0 || (invoiceCount || 0) > 0) continue;

      const firstName = profile.full_name?.split(" ")[0] || "there";
      try {
        const messageId = crypto.randomUUID();
        const html = `<div style="font-family:'Manrope',-apple-system,sans-serif;max-width:600px;margin:0 auto;"><div style="background:#0f172a;padding:30px 20px;text-align:center;border-radius:12px 12px 0 0;"><div style="font-size:28px;font-weight:700;color:#00E6A0;">Foreman</div></div><div style="padding:30px 25px;"><h2 style="color:#0f172a;">Hey ${firstName},</h2><p>We noticed you haven't been on Foreman recently. Your business doesn't stop — and neither should your quoting and invoicing.</p><div style="background:#f0fdf4;border-left:4px solid #00E6A0;padding:16px;margin:20px 0;border-radius:4px;"><p style="margin:0;font-weight:bold;">Quick wins waiting for you:</p><ul style="margin:8px 0 0;padding-left:20px;"><li>Create quotes in seconds with templates</li><li>Send invoices and get paid faster</li><li>Track your jobs and never miss an appointment</li></ul></div><a href="https://quotrai.lovable.app/dashboard" style="display:inline-block;background:#00E6A0;color:#0f172a;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0;">Jump Back In →</a><p style="color:#64748b;font-size:14px;margin-top:24px;">Need help? Chat with Foreman AI, your AI assistant, anytime.</p></div></div>`;

        await supabase.from("email_send_log").insert({ message_id: messageId, template_name: "churn-reengagement", recipient_email: profile.email, status: "pending" });
        const { error: enqueueError } = await supabase.rpc("enqueue_email", {
          queue_name: "transactional_emails",
          payload: { message_id: messageId, to: profile.email, from: `Foreman <noreply@${FROM_DOMAIN}>`, sender_domain: SENDER_DOMAIN, subject: `${firstName}, we miss you on Foreman! 🛠️`, html, text: `Hey ${firstName}, we noticed you haven't been on Foreman recently. Jump back in!`, purpose: "transactional", label: "churn-reengagement", queued_at: new Date().toISOString() },
        });
        if (enqueueError) throw enqueueError;

        await supabase.from("churn_events").insert({ team_id: profile.team_id, user_id: profile.id, event_type: "reengagement_email", email_sent: true, sent_at: new Date().toISOString() });

        // Audit log entry
        await supabase.from("comms_audit_log").insert({
          channel: "email", record_type: "churn_reengagement", record_id: profile.id,
          recipient: profile.email, template: "churn-reengagement",
          manual_send: false, confirmed_by_user: false,
          allowed: true, source_screen: "cron",
        });

        sentCount++;
      } catch (e) { console.error("Failed to send churn email:", e); }
    }

    return new Response(JSON.stringify({ sent: sentCount, skipped_suppressed: skippedSuppressed }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
