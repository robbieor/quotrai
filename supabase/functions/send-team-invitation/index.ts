import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  email: string;
  teamName: string;
  inviterName: string;
  inviteUrl: string;
}

const brandStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap');
  body { font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #0f172a; margin: 0; padding: 0; background-color: #f8fafc; }
  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
  .header { background: linear-gradient(135deg, #00FFB2, #00D4FF); padding: 30px 20px; text-align: center; border-radius: 12px 12px 0 0; }
  .header h1 { color: #0f172a; margin: 0; font-size: 24px; font-weight: 700; }
  .logo { font-size: 28px; font-weight: 700; color: #0f172a; margin-bottom: 10px; }
  .content { background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; }
  .team-name { font-size: 28px; font-weight: 700; background: linear-gradient(135deg, #00FFB2, #00D4FF); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin: 15px 0; text-align: center; }
  .button { display: inline-block; background: linear-gradient(135deg, #00FFB2, #00D4FF); color: #0f172a !important; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
  .note { background: #fef3c7; border: 1px solid #fbbf24; padding: 15px; border-radius: 8px; margin-top: 20px; font-size: 14px; color: #92400e; }
  .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; background: #f8fafc; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none; }
  .footer a { color: #00D4FF; text-decoration: none; }
`;

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // ──────────────────────────────────────────────────────────
  // COMMUNICATION SAFETY: Global kill switch
  // Note: Team invitations go to team members, not clients.
  // Still gated for consistency.
  // ──────────────────────────────────────────────────────────
  const outboundEnabled = Deno.env.get("OUTBOUND_COMMUNICATION_ENABLED") === "true";
  if (!outboundEnabled) {
    console.log("[SAFETY] send-team-invitation blocked: OUTBOUND_COMMUNICATION_ENABLED is false");
    return new Response(JSON.stringify({ error: "Outbound communication is currently disabled", blocked: true }), {
      status: 503, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    
    if (claimsError || !claimsData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { email, teamName, inviterName, inviteUrl }: InvitationRequest = await req.json();

    if (!email || !teamName || !inviteUrl) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const emailResponse = await resend.emails.send({
      from: `${inviterName || "Quotr"} <noreply@quotr.info>`,
      to: [email],
      subject: `You've been invited to join ${teamName} on Quotr`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${brandStyles}</style></head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">Quotr</div>
              <h1>🎉 You're Invited!</h1>
            </div>
            <div class="content">
              <p>Hi there,</p>
              <p><strong>${inviterName || "A team member"}</strong> has invited you to join:</p>
              <div class="team-name">${teamName}</div>
              <p style="text-align: center; color: #64748b;">Join the team to collaborate on jobs, quotes, invoices, and more.</p>
              <div style="text-align: center;"><a href="${inviteUrl}" class="button">Accept Invitation</a></div>
              <div class="note"><strong>⏰ Note:</strong> This invitation will expire in 7 days.</div>
              <p style="margin-top: 20px; color: #64748b; font-size: 14px;">If you weren't expecting this invitation, you can safely ignore this email.</p>
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
    console.error("Error sending invitation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

Deno.serve(handler);
