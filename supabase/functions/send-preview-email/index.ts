import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

import { EMAIL_FROM_DOMAIN as FROM_DOMAIN, EMAIL_SENDER_DOMAIN as SENDER_DOMAIN } from "../_shared/email-config.ts";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
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

    const recipientEmail = user.email;
    const docLabel = documentType === "invoice" ? "invoice" : "quote";
    const subject = `Your Revamo ${docLabel} preview`;
    const messageId = crypto.randomUUID();
    const idempotencyKey = `preview-${docLabel}-${messageId}`;

    // Unsubscribe token for compliance
    let unsubscribeToken: string;
    const { data: existingTokenRow } = await supabase
      .from("email_unsubscribe_tokens")
      .select("token")
      .eq("email", recipientEmail)
      .maybeSingle();

    if (existingTokenRow?.token) {
      unsubscribeToken = existingTokenRow.token;
    } else {
      unsubscribeToken = crypto.randomUUID();
      await supabase
        .from("email_unsubscribe_tokens")
        .insert({ email: recipientEmail, token: unsubscribeToken });
    }

    // Upload PDF to storage and get a signed download URL
    let pdfDownloadUrl: string | null = null;
    let pdfUploadFailed = false;
    try {
      const pdfBuffer = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));
      const filePath = `previews/preview-${docLabel}-${Date.now()}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from("document-emails")
        .upload(filePath, pdfBuffer, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (!uploadError) {
        const { data: urlData } = await supabase.storage
          .from("document-emails")
          .createSignedUrl(filePath, 60 * 60 * 24 * 7);
        pdfDownloadUrl = urlData?.signedUrl || null;
        if (!pdfDownloadUrl) pdfUploadFailed = true;
      } else {
        console.error("PDF upload error:", uploadError);
        pdfUploadFailed = true;
      }
    } catch (uploadErr) {
      console.error("Failed to upload preview PDF:", uploadErr);
      pdfUploadFailed = true;
    }

    const htmlBody = `
      <div style="font-family: 'Manrope', -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #0f172a; padding: 30px 25px; text-align: center; border-radius: 12px 12px 0 0;">
          <img src="https://revamo.ai/foreman-logo.png" alt="Revamo" width="140" style="display:block;margin:0 auto;" />
          <h2 style="color: #ffffff; margin: 10px 0 0; font-size: 20px; font-weight: 600;">Document Preview</h2>
        </div>
        <div style="padding: 30px 25px;">
          <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
            This is a <strong>test preview</strong> sent to you only. No customer has received this document.
          </p>
          <p style="color: #64748b; font-size: 14px; line-height: 1.6;">
            Your ${docLabel} preview PDF ${pdfDownloadUrl ? 'is available for download below' : 'could not be attached — please download it from the branding settings page instead'}.
          </p>
          ${pdfDownloadUrl ? `
          <div style="text-align: center; margin: 24px 0;">
            <a href="${pdfDownloadUrl}" style="display: inline-block; padding: 12px 24px; background: #00E6A0; color: #0f172a; font-weight: 600; font-size: 14px; text-decoration: none; border-radius: 8px;">
              📎 Download Preview PDF
            </a>
          </div>` : ''}
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 12px;">
            Sent from Revamo · This is an internal preview — not a customer communication.
          </p>
        </div>
      </div>
    `;

    // Log pending
    await supabase.from("email_send_log").insert({
      message_id: messageId,
      template_name: `preview_${docLabel}`,
      recipient_email: recipientEmail,
      status: "pending",
      metadata: { pdf_attached: !pdfUploadFailed },
    });

    // Enqueue
    const { error: enqueueError } = await supabase.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        message_id: messageId,
        idempotency_key: idempotencyKey,
        unsubscribe_token: unsubscribeToken,
        to: recipientEmail,
        from: `Revamo <support@${FROM_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject,
        html: htmlBody,
        text: `Your Revamo ${docLabel} preview — this is a test sent to you only.`,
        purpose: "transactional",
        label: `preview_${docLabel}`,
        queued_at: new Date().toISOString(),
      },
    });

    if (enqueueError) {
      console.error("Failed to enqueue preview email:", enqueueError);
      throw new Error("Failed to enqueue preview email");
    }

    // Audit log
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
        metadata: {
          type: "internal_preview",
          document_type: documentType,
          message_id: messageId,
          pdf_attached: !pdfUploadFailed,
        },
      });
    }

    // Return explicit status so UI can show the right message
    const status = pdfUploadFailed ? "queued_without_pdf" : "queued_with_pdf";

    return new Response(
      JSON.stringify({
        success: true,
        queued: true,
        status,
        sentTo: recipientEmail,
        message_id: messageId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Preview email error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to send preview email", status: "failed" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

Deno.serve(handler);
