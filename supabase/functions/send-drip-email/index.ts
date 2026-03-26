import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SENDER_DOMAIN = "notify.foreman.ie";
const FROM_DOMAIN = "foreman.ie";

interface DripRow { id: string; user_id: string; email: string; full_name: string | null; drip_step: number; send_at: string; }

const DRIP_TEMPLATES: Record<number, { subject: string; body: (name: string) => string }> = {
  1: { subject: "Create your first quote in 60 seconds ⚡", body: (name) => `Hi ${name},\n\nWelcome to Foreman! The easiest way to get started is to create your first quote.\n\nHead to Quotes → New Quote and pick one of your trade-specific templates.\n\nHappy quoting!\n— The Foreman Team` },
  2: { subject: "Meet Foreman AI — your hands-free assistant 🤖", body: (name) => `Hey ${name},\n\nDid you know Foreman comes with a built-in AI assistant?\n\nForeman AI can create quotes, schedule jobs, log expenses, and more — all by voice or text.\n\nTry it: Go to the Foreman AI page and say "What can you do?"\n\n— The Foreman Team` },
  3: { subject: "How much admin time could you save? 📊", body: (name) => `Hi ${name},\n\nTradespeople using Foreman save an average of 10 hours per week on admin.\n\nCurious what that means for your business? Try our ROI calculator on the homepage.\n\n— The Foreman Team` },
  4: { subject: "Your free trial ends in 2 days ⏰", body: (name) => `Hi ${name},\n\nJust a heads-up — your 14-day Foreman trial ends soon.\n\nTo keep all your data, subscribe from Settings → Billing.\n\n— The Foreman Team` },
};

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

      await supabase.from("email_send_log").insert({ message_id: messageId, template_name: `drip:${row.drip_step}`, recipient_email: row.email, status: "pending" });
      const { error: enqueueError } = await supabase.rpc("enqueue_email", {
        queue_name: "transactional_emails",
        payload: { message_id: messageId, to: row.email, from: `Foreman <support@${FROM_DOMAIN}>`, sender_domain: SENDER_DOMAIN, subject: template.subject, html: `<div style="font-family:'Manrope',sans-serif;max-width:600px;margin:0 auto;"><div style="background:#0f172a;padding:30px 25px;text-align:center;border-radius:12px 12px 0 0;"><img src="https://quotrai.lovable.app/foreman-logo.png" alt="Foreman" width="140" style="display:block;margin:0 auto;" /></div><div style="padding:30px 25px;"><pre style="font-family:'Manrope',sans-serif;white-space:pre-wrap;">${template.body(name)}</pre></div></div>`, text: template.body(name), purpose: "transactional", label: `drip:${row.drip_step}`, queued_at: new Date().toISOString() },
      });

      if (enqueueError) { console.error(`Failed drip ${row.drip_step} to ${row.email}:`, enqueueError); continue; }

      await supabase.from("drip_queue").update({ sent: true, sent_at: new Date().toISOString() }).eq("id", row.id);

      // Audit log entry
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
