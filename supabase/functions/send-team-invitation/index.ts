import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SENDER_DOMAIN = "notify.quotr.work";
const FROM_DOMAIN = "quotr.work";

interface InvitationRequest {
  email: string;
  teamName: string;
  inviterName: string;
  inviteUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { email, teamName, inviterName, inviteUrl }: InvitationRequest = await req.json();

    if (!email || !teamName || !inviteUrl) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const serviceSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const messageId = crypto.randomUUID();
    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="font-family: 'Manrope', -apple-system, sans-serif; background: #f8fafc; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto;">
          <div style="background: #0f172a; padding: 30px 20px; text-align: center; border-radius: 12px 12px 0 0;">
            <img src="https://quotrai.lovable.app/foreman-logo.png" alt="Foreman" width="140" style="display:block;margin:0 auto;" />
            <h1 style="color: #ffffff; margin: 10px 0 0; font-size: 24px; font-weight: 700;">🎉 You're Invited!</h1>
          </div>
          <div style="background: #fff; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
            <p>Hi there,</p>
            <p><strong>${inviterName || "A team member"}</strong> has invited you to join:</p>
            <div style="font-size: 28px; font-weight: 700; text-align: center; margin: 15px 0; color: #00B386;">${teamName}</div>
            <p style="text-align: center; color: #64748b;">Join the team to collaborate on jobs, quotes, invoices, and more.</p>
            <div style="text-align: center;">
              <a href="${inviteUrl}" style="display: inline-block; background: #00E6A0; color: #0f172a; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0;">Accept Invitation</a>
            </div>
            <div style="background: #fef3c7; border: 1px solid #fbbf24; padding: 15px; border-radius: 8px; margin-top: 20px; font-size: 14px; color: #92400e;">
              <strong>⏰ Note:</strong> This invitation will expire in 7 days.
            </div>
            <p style="margin-top: 20px; color: #64748b; font-size: 14px;">If you weren't expecting this invitation, you can safely ignore this email.</p>
          </div>
          <div style="text-align: center; padding: 20px; color: #64748b; font-size: 12px;">
            Powered by <a href="#" style="color: #00E6A0; text-decoration: none;">Foreman</a>
          </div>
        </div>
      </body>
      </html>
    `;

    await serviceSupabase.from("email_send_log").insert({
      message_id: messageId, template_name: "team-invitation",
      recipient_email: email, status: "pending",
    });

    const { error: enqueueError } = await serviceSupabase.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        message_id: messageId,
        to: email,
        from: `${inviterName || "Foreman"} <noreply@${FROM_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject: `You've been invited to join ${teamName} on Foreman`,
        html,
        text: `${inviterName || "A team member"} has invited you to join ${teamName} on Foreman. Accept here: ${inviteUrl}`,
        purpose: "transactional",
        label: "team-invitation",
        queued_at: new Date().toISOString(),
      },
    });

    if (enqueueError) throw enqueueError;

    return new Response(JSON.stringify({ success: true, queued: true }), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending invitation:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

Deno.serve(handler);
