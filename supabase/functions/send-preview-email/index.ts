import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Authenticate the caller
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user?.email) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { pdfBase64, documentType } = await req.json();

    if (!pdfBase64 || !documentType) {
      return new Response(
        JSON.stringify({ error: "Missing pdfBase64 or documentType" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // SAFETY: Only send to the authenticated user's own email — never accept a recipient param
    const recipientEmail = user.email;
    const docLabel = documentType === "invoice" ? "invoice" : "quote";
    const subject = `Your Quotr ${docLabel} preview`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SENDER_DOMAIN = "notify.quotr.work";
    const FROM_DOMAIN = "quotr.work";

    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email sending not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #0f172a; margin-bottom: 8px;">Document Preview</h2>
        <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
          This is a <strong>test preview</strong> sent to you only. No customer has received this document.
        </p>
        <p style="color: #64748b; font-size: 14px; line-height: 1.6;">
          Your ${docLabel} preview PDF is attached. Use this to verify your branding, layout, and content before sending to clients.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 12px;">
          Sent from Quotr · This is an internal preview — not a customer communication.
        </p>
      </div>
    `;

    // Send email via Lovable's managed email API
    const emailResponse = await fetch(
      `https://email.lovable.dev/v1/send`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
        },
        body: JSON.stringify({
          sender_domain: SENDER_DOMAIN,
          from: `Quotr <noreply@${FROM_DOMAIN}>`,
          to: recipientEmail,
          subject,
          html: htmlBody,
          attachments: [
            {
              filename: `preview-${docLabel}.pdf`,
              content: pdfBase64,
              encoding: "base64",
              content_type: "application/pdf",
            },
          ],
        }),
      }
    );

    if (!emailResponse.ok) {
      const errText = await emailResponse.text();
      console.error("Email API error:", errText);
      // Fallback: try without attachment (API may not support attachments)
      // Send just the email with a note
      const fallbackResponse = await fetch(
        `https://email.lovable.dev/v1/send`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
          },
          body: JSON.stringify({
            sender_domain: SENDER_DOMAIN,
            from: `Quotr <noreply@${FROM_DOMAIN}>`,
            to: recipientEmail,
            subject,
            html: htmlBody.replace(
              "is attached",
              "could not be attached — please download it from the branding settings page instead"
            ),
          }),
        }
      );

      if (!fallbackResponse.ok) {
        const fallbackErr = await fallbackResponse.text();
        console.error("Fallback email error:", fallbackErr);
        return new Response(
          JSON.stringify({ error: "Failed to send preview email" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Log as internal preview event
    const teamResult = await supabase
      .from("team_members")
      .select("team_id")
      .eq("user_id", user.id)
      .single();

    if (teamResult.data?.team_id) {
      await supabase.from("comms_audit_log").insert({
        team_id: teamResult.data.team_id,
        user_id: user.id,
        channel: "email",
        recipient: recipientEmail,
        template: `preview_${docLabel}`,
        allowed: true,
        manual_send: true,
        confirmed_by_user: true,
        source_screen: "branding_settings",
        record_type: "preview",
        metadata: { type: "internal_preview", document_type: documentType },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        sentTo: recipientEmail,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Preview email error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

Deno.serve(handler);
