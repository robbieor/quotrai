import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  quoteId: string;
  action: "accepted" | "declined";
  declineReason?: string;
  invoiceNumber?: string;
}

const brandStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap');
  body { font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #0f172a; margin: 0; padding: 0; background-color: #f8fafc; }
  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
  .header { padding: 30px 20px; text-align: center; border-radius: 12px 12px 0 0; }
  .header-accepted { background: linear-gradient(135deg, #00FFB2, #00D4FF); }
  .header-declined { background: linear-gradient(135deg, #fbbf24, #f59e0b); }
  .header h1 { color: #0f172a; margin: 0; font-size: 24px; font-weight: 700; }
  .logo { font-size: 28px; font-weight: 700; color: #0f172a; margin-bottom: 10px; }
  .content { background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; }
  .status-badge { display: inline-block; padding: 8px 20px; border-radius: 20px; font-weight: 600; margin: 10px 0; font-size: 14px; }
  .status-accepted { background: linear-gradient(135deg, #00FFB2, #00D4FF); color: #0f172a; }
  .status-declined { background: #fef3c7; color: #92400e; border: 1px solid #fbbf24; }
  .details { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
  .details-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
  .details-row:last-child { border-bottom: none; }
  .reason-box { background: #fef3c7; border: 1px solid #fbbf24; padding: 15px; border-radius: 8px; margin: 15px 0; color: #92400e; }
  .invoice-box { background: linear-gradient(135deg, rgba(0, 255, 178, 0.1), rgba(0, 212, 255, 0.1)); border: 1px solid #00D4FF; padding: 15px; border-radius: 8px; margin: 15px 0; color: #0f172a; }
  .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; background: #f8fafc; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none; }
  .footer a { color: #00D4FF; text-decoration: none; }
`;

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // ──────────────────────────────────────────────────────────
  // COMMUNICATION SAFETY: Global kill switch
  // Note: This notification goes to the BUSINESS OWNER, not a client.
  // Still gated for consistency.
  // ──────────────────────────────────────────────────────────
  const outboundEnabled = Deno.env.get("OUTBOUND_COMMUNICATION_ENABLED") === "true";
  if (!outboundEnabled) {
    console.log("[SAFETY] send-quote-notification blocked: OUTBOUND_COMMUNICATION_ENABLED is false");
    return new Response(JSON.stringify({ blocked: true, reason: "kill_switch" }), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const { quoteId, action, declineReason, invoiceNumber }: NotificationRequest = await req.json();

    if (!quoteId || !action) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: quote, error: quoteError } = await supabase
      .from("quotes")
      .select(`*, customer:customers(name, email), team:teams(name)`)
      .eq("id", quoteId)
      .single();

    if (quoteError || !quote) {
      return new Response(
        JSON.stringify({ error: "Quote not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { data: teamMemberships } = await supabase
      .from("team_memberships")
      .select("user_id")
      .eq("team_id", quote.team_id)
      .eq("role", "owner");

    if (!teamMemberships?.length) {
      return new Response(
        JSON.stringify({ error: "Team owner not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { data: ownerProfile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", teamMemberships[0].user_id)
      .single();

    if (!ownerProfile?.email) {
      return new Response(
        JSON.stringify({ error: "Owner email not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const formattedTotal = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(quote.total || 0);
    const isAccepted = action === "accepted";
    const statusLabel = isAccepted ? "Accepted" : "Declined";
    const emoji = isAccepted ? "🎉" : "📋";

    const emailResponse = await resend.emails.send({
      from: `Quotr Notifications <onboarding@resend.dev>`,
      to: [ownerProfile.email],
      subject: `${emoji} Quote ${quote.quote_number} has been ${statusLabel.toLowerCase()}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${brandStyles}</style></head>
        <body>
          <div class="container">
            <div class="header ${isAccepted ? 'header-accepted' : 'header-declined'}">
              <div class="logo">Quotr</div>
              <h1>${emoji} Quote ${statusLabel}</h1>
            </div>
            <div class="content">
              <p>Hi ${ownerProfile.full_name || "there"},</p>
              <p>${isAccepted ? "Great news! Your quote has been accepted by the customer." : "Your quote has received a response from the customer."}</p>
              <div style="text-align: center;"><span class="status-badge ${isAccepted ? 'status-accepted' : 'status-declined'}">${statusLabel.toUpperCase()}</span></div>
              <div class="details">
                <div class="details-row"><span><strong>Quote Number:</strong></span><span>${quote.quote_number}</span></div>
                <div class="details-row"><span><strong>Customer:</strong></span><span>${quote.customer?.name || "Unknown"}</span></div>
                <div class="details-row"><span><strong>Amount:</strong></span><span><strong>${formattedTotal}</strong></span></div>
              </div>
              ${isAccepted && invoiceNumber ? `<div class="invoice-box"><strong>✅ Invoice Created:</strong> ${invoiceNumber}</div>` : ''}
              ${!isAccepted && declineReason ? `<div class="reason-box"><strong>💬 Customer's Reason:</strong><br>${declineReason}</div>` : ''}
              <p style="margin-top: 20px;">Log in to your Quotr account to view the details.</p>
            </div>
            <div class="footer"><p>Powered by <a href="#">Quotr</a></p></div>
          </div>
        </body>
        </html>
      `,
    });

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

Deno.serve(handler);
