import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import { EMAIL_FROM_DOMAIN as FROM_DOMAIN, EMAIL_SENDER_DOMAIN as SENDER_DOMAIN } from "../_shared/email-config.ts";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const outboundEnabled = Deno.env.get("OUTBOUND_COMMUNICATION_ENABLED") === "true";
  if (!outboundEnabled) {
    return new Response(JSON.stringify({ blocked: true, reason: "kill_switch" }), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const { quoteId, action, declineReason, invoiceNumber } = await req.json();
    if (!quoteId || !action) return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: quote, error: quoteError } = await supabase.from("quotes").select(`*, customer:customers(name, email), team:teams(name)`).eq("id", quoteId).single();
    if (quoteError || !quote) return new Response(JSON.stringify({ error: "Quote not found" }), { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } });

    const { data: teamMemberships } = await supabase.from("team_memberships").select("user_id").eq("team_id", quote.team_id).eq("role", "owner");
    if (!teamMemberships?.length) return new Response(JSON.stringify({ error: "Team owner not found" }), { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } });

    const { data: ownerProfile } = await supabase.from("profiles").select("email, full_name").eq("id", teamMemberships[0].user_id).single();
    if (!ownerProfile?.email) return new Response(JSON.stringify({ error: "Owner email not found" }), { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } });

    const formattedTotal = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(quote.total || 0);
    const isAccepted = action === "accepted";
    const statusLabel = isAccepted ? "Accepted" : "Declined";
    const emoji = isAccepted ? "🎉" : "📋";

    const messageId = crypto.randomUUID();
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:'Manrope',-apple-system,sans-serif;background:#f8fafc;margin:0;padding:20px;"><div style="max-width:600px;margin:0 auto;"><div style="background:#0f172a;padding:30px 20px;text-align:center;border-radius:12px 12px 0 0;"><img src="https://revamo.ai/foreman-logo.png" alt="Revamo" width="140" style="display:block;margin:0 auto;" /><h1 style="color:#ffffff;margin:10px 0 0;font-size:24px;">${emoji} Quote ${statusLabel}</h1></div><div style="background:#fff;padding:30px;border:1px solid #e2e8f0;border-top:none;"><p>Hi ${ownerProfile.full_name || "there"},</p><p>${isAccepted ? "Great news! Your quote has been accepted by the customer." : "Your quote has received a response from the customer."}</p><div style="background:#f8fafc;padding:20px;border-radius:8px;margin:20px 0;"><p><strong>Quote:</strong> ${quote.display_number}</p><p><strong>Customer:</strong> ${quote.customer?.name || "Unknown"}</p><p><strong>Amount:</strong> ${formattedTotal}</p></div>${isAccepted && invoiceNumber ? `<div style="background:rgba(0,230,160,0.1);border:1px solid #00E6A0;padding:15px;border-radius:8px;margin:15px 0;">✅ Invoice Created: ${invoiceNumber}</div>` : ''}${!isAccepted && declineReason ? `<div style="background:#fef3c7;border:1px solid #fbbf24;padding:15px;border-radius:8px;margin:15px 0;">💬 Customer's Reason: ${declineReason}</div>` : ''}<p>Log in to your Revamo account to view the details.</p></div><div style="text-align:center;padding:20px;color:#64748b;font-size:12px;">Powered by Revamo</div></div></body></html>`;

    await supabase.from("email_send_log").insert({ message_id: messageId, template_name: "quote-notification", recipient_email: ownerProfile.email, status: "pending" });
    const { error: enqueueError } = await supabase.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: { message_id: messageId, to: ownerProfile.email, from: `Revamo <support@${FROM_DOMAIN}>`, sender_domain: SENDER_DOMAIN, subject: `${emoji} Quote ${quote.display_number} has been ${statusLabel.toLowerCase()}`, html, text: `Quote ${quote.display_number} has been ${statusLabel.toLowerCase()}`, purpose: "transactional", label: "quote-notification", queued_at: new Date().toISOString() },
    });
    if (enqueueError) throw enqueueError;

    return new Response(JSON.stringify({ success: true, queued: true }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
};

Deno.serve(handler);
