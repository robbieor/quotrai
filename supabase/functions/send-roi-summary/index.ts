import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SENDER_DOMAIN = "notify.quotr.work";
const FROM_DOMAIN = "quotr.work";

function sanitizeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function formatCurrency(amount: number, currency: string = "£"): string {
  return `${currency}${Math.round(amount).toLocaleString("en-GB")}`;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const outboundEnabled = Deno.env.get("OUTBOUND_COMMUNICATION_ENABLED") === "true";
  if (!outboundEnabled) return new Response(JSON.stringify({ error: "Outbound communication is currently disabled", blocked: true }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const data = await req.json();
    if (!data.email || !data.email.includes("@")) return new Response(JSON.stringify({ error: "Valid email is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const safeName = sanitizeHtml(data.name || "there");
    const firstName = safeName.split(" ")[0];

    const emailHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;font-family:'Manrope',-apple-system,sans-serif;background-color:#f4f4f5;"><table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f4f4f5;padding:40px 20px;"><tr><td align="center"><table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;"><tr><td style="background:#0f172a;padding:40px;"><h1 style="margin:0;color:#00E6A0;font-size:28px;font-weight:700;">Foreman</h1><p style="margin:10px 0 0;color:#ffffff;font-size:20px;">Your ROI Summary</p><p style="margin:10px 0 0;color:#94a3b8;">Hey ${firstName}, here's what you could save</p></td></tr><tr><td style="padding:40px;"><div style="background:#f0fdf4;border-radius:12px;padding:30px;text-align:center;border:1px solid #00E6A0;"><p style="margin:0 0 8px;color:#64748b;font-size:14px;">Your Potential Monthly Savings</p><p style="margin:0;color:#00B386;font-size:48px;font-weight:800;">${formatCurrency(data.monthlyNetSavings)}</p><p style="margin:12px 0 0;color:#64748b;font-size:14px;">That's <strong>${formatCurrency(data.annualSavings)}/year</strong></p></div></td></tr><tr><td style="padding:0 40px 40px;text-align:center;"><a href="https://quotrai.lovable.app/request-access" style="display:inline-block;background:#00E6A0;color:#0f172a;text-decoration:none;padding:16px 40px;border-radius:8px;font-size:16px;font-weight:600;">Get Early Access →</a></td></tr><tr><td style="background-color:#f8fafc;padding:30px 40px;text-align:center;border-top:1px solid #e2e8f0;"><p style="margin:0;color:#94a3b8;font-size:12px;">Foreman — The complete platform for trade businesses</p></td></tr></table></td></tr></table></body></html>`;

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const messageId = crypto.randomUUID();

    await supabase.from("email_send_log").insert({ message_id: messageId, template_name: "roi-summary", recipient_email: data.email, status: "pending" });
    const { error: enqueueError } = await supabase.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: { message_id: messageId, to: data.email, from: `Foreman <noreply@${FROM_DOMAIN}>`, sender_domain: SENDER_DOMAIN, subject: `${firstName}, you could save ${formatCurrency(data.monthlyNetSavings)}/month with Foreman`, html: emailHtml, text: `Hey ${firstName}, you could save ${formatCurrency(data.monthlyNetSavings)}/month with Foreman.`, purpose: "transactional", label: "roi-summary", queued_at: new Date().toISOString() },
    });
    if (enqueueError) throw enqueueError;

    // Audit log entry
    await supabase.from("comms_audit_log").insert({
      channel: "email", record_type: "roi_summary", record_id: null,
      recipient: data.email, template: "roi-summary",
      manual_send: false, confirmed_by_user: false,
      allowed: true, source_screen: "system",
    });

    return new Response(JSON.stringify({ success: true, queued: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: unknown) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
};

Deno.serve(handler);
