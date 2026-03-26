import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SENDER_DOMAIN = "notify.foreman.ie";
const FROM_DOMAIN = "foreman.ie";

function escapeHtml(text: string | undefined | null): string {
  if (!text) return "";
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { companyName, contactName, email, phone, tradeType, teamSize, country, message } = await req.json();
    if (!companyName || !contactName || !email) return new Response(JSON.stringify({ error: "Company name, contact name, and email are required" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });

    const safe = { companyName: escapeHtml(companyName), contactName: escapeHtml(contactName), email: escapeHtml(email), phone: escapeHtml(phone), tradeType: escapeHtml(tradeType), teamSize: escapeHtml(teamSize), country: escapeHtml(country), message: escapeHtml(message) };

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: savedRequest, error: dbError } = await supabase.from("early_access_requests").insert({
      company_name: companyName, contact_name: contactName, email, phone: phone || null,
      trade_type: tradeType || null, team_size: teamSize || null, country: country || null,
      message: message || null, status: "pending"
    }).select().single();

    if (dbError) return new Response(JSON.stringify({ error: "Failed to save request" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });

    // Admin notification
    const adminHtml = `<div style="font-family:'Manrope',sans-serif;max-width:600px;margin:0 auto;"><div style="background:#0f172a;padding:30px;text-align:center;border-radius:12px 12px 0 0;"><img src="https://quotrai.lovable.app/foreman-logo.png" alt="Foreman" width="140" style="display:block;margin:0 auto;" /><h1 style="color:#ffffff;margin:10px 0 0;">🚀 New Early Access Request</h1></div><div style="padding:30px;background:#fff;border:1px solid #e2e8f0;border-top:none;"><p><strong>Company:</strong> ${safe.companyName}</p><p><strong>Contact:</strong> ${safe.contactName}</p><p><strong>Email:</strong> ${safe.email}</p>${safe.phone ? `<p><strong>Phone:</strong> ${safe.phone}</p>` : ''}${safe.tradeType ? `<p><strong>Trade:</strong> ${safe.tradeType}</p>` : ''}${safe.teamSize ? `<p><strong>Team Size:</strong> ${safe.teamSize}</p>` : ''}${safe.country ? `<p><strong>Country:</strong> ${safe.country}</p>` : ''}${safe.message ? `<div style="background:#f0fdf4;border-left:4px solid #00E6A0;padding:16px;margin-top:20px;"><strong>Message:</strong><p>${safe.message}</p></div>` : ''}<p style="color:#94a3b8;font-size:12px;">ID: ${savedRequest.id}</p></div></div>`;

    const adminMsgId = crypto.randomUUID();
    await supabase.from("email_send_log").insert({ message_id: adminMsgId, template_name: "early-access-admin", recipient_email: "support@foreman.ie", status: "pending" });
    await supabase.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: { message_id: adminMsgId, to: "support@foreman.ie", from: `Foreman <noreply@${FROM_DOMAIN}>`, sender_domain: SENDER_DOMAIN, subject: `New Early Access Request: ${safe.companyName}`, html: adminHtml, text: `New early access request from ${safe.contactName} at ${safe.companyName}`, purpose: "transactional", label: "early-access-admin", queued_at: new Date().toISOString() },
    });

    // Confirmation to requester
    const confirmHtml = `<div style="font-family:'Manrope',sans-serif;max-width:600px;margin:0 auto;"><div style="background:#0f172a;padding:40px 30px;text-align:center;border-radius:12px 12px 0 0;"><img src="https://quotrai.lovable.app/foreman-logo.png" alt="Foreman" width="140" style="display:block;margin:0 auto;" /><h1 style="color:#ffffff;margin:10px 0 0;">Welcome! 🎉</h1><p style="color:#94a3b8;">Your request has been received</p></div><div style="padding:40px 30px;background:#fff;border:1px solid #e2e8f0;border-top:none;"><h2 style="color:#0f172a;">Hi ${safe.contactName},</h2><p>Thank you for your interest in Foreman!</p><p>We've received your early access request for <strong>${safe.companyName}</strong>. We'll be in touch within <strong>24-48 hours</strong>.</p><div style="background:#f0fdf4;border-radius:8px;padding:20px;margin:24px 0;"><p>💡 <strong>What happens next?</strong><br>We'll set up your account and walk you through the platform.</p></div><p><strong>The Foreman Team</strong></p></div></div>`;

    const confirmMsgId = crypto.randomUUID();
    await supabase.from("email_send_log").insert({ message_id: confirmMsgId, template_name: "early-access-confirm", recipient_email: email, status: "pending" });
    await supabase.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: { message_id: confirmMsgId, to: email, from: `Foreman <hello@${FROM_DOMAIN}>`, sender_domain: SENDER_DOMAIN, subject: "Welcome to Foreman! 🚀", html: confirmHtml, text: `Hi ${contactName}, thank you for your interest in Foreman! We'll be in touch within 24-48 hours.`, purpose: "transactional", label: "early-access-confirm", queued_at: new Date().toISOString() },
    });

    return new Response(JSON.stringify({ success: true, message: "Request submitted successfully" }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (error: unknown) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "An error occurred processing your request" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
};

Deno.serve(handler);
