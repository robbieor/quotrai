import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SENDER_DOMAIN = "notify.foreman.ie";
const FROM_DOMAIN = "foreman.ie";
const APP_URL = "https://quotrai.lovable.app";

interface DripRow { id: string; user_id: string; email: string; full_name: string | null; drip_step: number; send_at: string; }

const btnStyle = `display:inline-block;background:#00E6A0;color:#0f172a;font-family:'Manrope',sans-serif;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:12px;margin-top:8px;`;

const DRIP_TEMPLATES: Record<number, { subject: string; body: (name: string) => string; cta: { label: string; url: string } }> = {
  1: {
    subject: "Welcome to Foreman — meet George, your AI partner 🤝",
    body: (name) => `Hey ${name},\n\nWelcome to Foreman! I'm George — your AI business partner.\n\nI can create quotes, chase invoices, schedule jobs, and give you a morning briefing — all by voice or text.\n\nSay "What can you do?" to get started.`,
    cta: { label: "Talk to George →", url: `${APP_URL}/george` },
  },
  2: {
    subject: "Create your first quote in 30 seconds ⚡",
    body: (name) => `Hi ${name},\n\nThe fastest way to see Foreman in action? Create your first quote.\n\nPick a template for your trade, fill in the details — or just tell George:\n\n"Quote for [customer], [job], [amount]"\n\nI'll do the rest.`,
    cta: { label: "Create a Quote →", url: `${APP_URL}/quotes` },
  },
  3: {
    subject: "Your business snapshot is ready 📊",
    body: (name) => `Hi ${name},\n\nI've been looking at your business data. Your morning briefing is ready — overdue invoices, upcoming jobs, and what needs your attention today.\n\nThe more data you add, the smarter my insights get.`,
    cta: { label: "View Your Dashboard →", url: `${APP_URL}/dashboard` },
  },
  4: {
    subject: "Your crew should be on Foreman too 👷",
    body: (name) => `Hey ${name},\n\nForeman works even better with your team. Your trial includes unlimited seats — invite your crew now.\n\nThey'll get their own login, see assigned jobs, and clock in/out from their phone.`,
    cta: { label: "Invite Your Team →", url: `${APP_URL}/settings` },
  },
  5: {
    subject: "Your free trial ends soon ⏰",
    body: (name) => `Hi ${name},\n\nJust a heads-up — your Foreman trial wraps up soon.\n\nTo keep everything running (and keep me on the job), pick the plan that fits. All your data stays safe.`,
    cta: { label: "Choose a Plan →", url: `${APP_URL}/settings` },
  },
};

function buildHtml(bodyText: string, cta: { label: string; url: string }, name: string): string {
  const paragraphs = bodyText.split("\n\n").map(p => 
    `<p style="font-family:'Manrope',sans-serif;font-size:15px;color:#64748b;line-height:1.6;margin:0 0 16px;">${p.replace(/\n/g, "<br/>")}</p>`
  ).join("");

  return `<div style="font-family:'Manrope',sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
  <div style="background:#0f172a;padding:30px 25px;text-align:center;border-radius:12px 12px 0 0;">
    <img src="https://foreman.world/foreman-logo.png" alt="Foreman" width="140" style="display:block;margin:0 auto;" />
  </div>
  <div style="padding:30px 25px;">
    ${paragraphs}
    <div style="text-align:center;margin:24px 0 16px;">
      <a href="${cta.url}" style="${btnStyle}">${cta.label}</a>
    </div>
    <p style="font-family:'Manrope',sans-serif;font-size:14px;color:#64748b;margin:24px 0 0;">— George</p>
  </div>
  <div style="text-align:center;padding:20px 25px;border-top:1px solid #e2e8f0;">
    <p style="margin:0;color:#94a3b8;font-size:12px;font-family:'Manrope',sans-serif;">Need help? <a href="mailto:support@foreman.ie" style="color:#94a3b8;">support@foreman.ie</a></p>
  </div>
</div>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const outboundEnabled = Deno.env.get("OUTBOUND_COMMUNICATION_ENABLED") === "true";
  if (!outboundEnabled) return new Response(JSON.stringify({ sent: 0, blocked: true, reason: "kill_switch" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: queue, error: fetchError } = await supabase.from("drip_queue").select("*").eq("sent", false).lte("send_at", new Date().toISOString()).limit(50);
    if (fetchError) throw fetchError;
    if (!queue || queue.length === 0) return new Response(JSON.stringify({ sent: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    let sentCount = 0;
    for (const row of queue as DripRow[]) {
      const template = DRIP_TEMPLATES[row.drip_step];
      if (!template) continue;
      const name = row.full_name?.split(" ")[0] || "there";
      const messageId = crypto.randomUUID();
      const bodyText = template.body(name);
      const html = buildHtml(bodyText, template.cta, name);

      await supabase.from("email_send_log").insert({ message_id: messageId, template_name: `drip:${row.drip_step}`, recipient_email: row.email, status: "pending" });
      const { error: enqueueError } = await supabase.rpc("enqueue_email", {
        queue_name: "transactional_emails",
        payload: { message_id: messageId, to: row.email, from: `Foreman <support@${FROM_DOMAIN}>`, sender_domain: SENDER_DOMAIN, subject: template.subject, html, text: bodyText, purpose: "transactional", label: `drip:${row.drip_step}`, queued_at: new Date().toISOString() },
      });

      if (enqueueError) { console.error(`Failed drip ${row.drip_step} to ${row.email}:`, enqueueError); continue; }

      await supabase.from("drip_queue").update({ sent: true, sent_at: new Date().toISOString() }).eq("id", row.id);

      await supabase.from("comms_audit_log").insert({
        channel: "email", record_type: "drip_onboarding", record_id: row.id,
        recipient: row.email, template: `drip:${row.drip_step}`,
        manual_send: false, confirmed_by_user: false,
        allowed: true, source_screen: "cron",
      });

      sentCount++;
    }

    return new Response(JSON.stringify({ sent: sentCount }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: unknown) {
    console.error("Drip email error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
