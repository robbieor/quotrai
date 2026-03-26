import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SENDER_DOMAIN = "notify.quotr.work";
const FROM_DOMAIN = "quotr.work";

interface EmailRequest {
  to: string;
  customerName: string;
  documentType: "invoice" | "quote";
  documentNumber: string;
  total: number;
  dueDate?: string;
  validUntil?: string;
  fromName: string;
  pdfBase64?: string;
  portalUrl?: string;
  // SAFETY FIELDS — required for all sends
  manual_send?: boolean;
  confirmed_by_user?: boolean;
  source_screen?: string;
  record_type?: string;
  record_id?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const outboundEnabled = Deno.env.get("OUTBOUND_COMMUNICATION_ENABLED") === "true";

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { 
      to, customerName, documentType, documentNumber, total, 
      dueDate, validUntil, fromName, pdfBase64, portalUrl,
      manual_send, confirmed_by_user, source_screen, record_type, record_id,
    }: EmailRequest = await req.json();

    // COMMUNICATION SAFETY: Require manual_send + confirmed_by_user
    if (!manual_send || !confirmed_by_user) {
      await supabase.from("comms_audit_log").insert({
        channel: "email", record_type: record_type || documentType,
        record_id: record_id || null, recipient: to,
        template: `send-document-email:${documentType}`,
        manual_send: manual_send || false, confirmed_by_user: confirmed_by_user || false,
        allowed: false, blocked_reason: "Missing manual_send or confirmed_by_user flag",
        source_screen: source_screen || null,
      });
      return new Response(
        JSON.stringify({ error: "Send blocked: manual_send and confirmed_by_user required" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!outboundEnabled) {
      await supabase.from("comms_audit_log").insert({
        channel: "email", record_type: record_type || documentType,
        record_id: record_id || null, recipient: to,
        template: `send-document-email:${documentType}`,
        manual_send: true, confirmed_by_user: true,
        allowed: false, blocked_reason: "OUTBOUND_COMMUNICATION_ENABLED is false",
        source_screen: source_screen || null,
      });
      return new Response(
        JSON.stringify({ error: "Outbound communication is currently disabled" }),
        { status: 503, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!to || !customerName || !documentType || !documentNumber) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const formattedTotal = new Intl.NumberFormat("en-US", {
      style: "currency", currency: "USD",
    }).format(total);

    const isInvoice = documentType === "invoice";
    const documentLabel = isInvoice ? "Invoice" : "Quote";
    const dateLabel = isInvoice ? "Due Date" : "Valid Until";
    const dateValue = isInvoice ? dueDate : validUntil;

    // If PDF is provided, upload to storage and include download link
    let pdfDownloadUrl: string | null = null;
    if (pdfBase64) {
      try {
        const pdfBuffer = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));
        const filePath = `documents/${documentNumber}.pdf`;
        
        const { error: uploadError } = await supabase.storage
          .from("document-emails")
          .upload(filePath, pdfBuffer, {
            contentType: "application/pdf",
            upsert: true,
          });

        if (!uploadError) {
          const { data: urlData } = await supabase.storage
            .from("document-emails")
            .createSignedUrl(filePath, 60 * 60 * 24 * 7); // 7 day expiry
          pdfDownloadUrl = urlData?.signedUrl || null;
        } else {
          console.error("PDF upload error:", uploadError);
        }
      } catch (uploadErr) {
        console.error("Failed to upload PDF:", uploadErr);
      }
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: 'Manrope', -apple-system, sans-serif; background: #f8fafc; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto;">
          <div style="background: #0f172a; padding: 30px 20px; text-align: center; border-radius: 12px 12px 0 0;">
            <div style="font-size: 28px; font-weight: 700; color: #00E6A0;">Foreman</div>
            <h1 style="color: #ffffff; margin: 10px 0 0; font-size: 24px; font-weight: 700;">${documentLabel} ${documentNumber}</h1>
          </div>
          <div style="background: #fff; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
            <p>Dear ${customerName},</p>
            <p>${isInvoice 
              ? "Please find your invoice details below. Thank you for your business!" 
              : "Please find your quote details below. We look forward to working with you!"}</p>
            <div style="font-size: 36px; font-weight: 700; text-align: center; margin: 20px 0; color: #00B386;">${formattedTotal}</div>
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                <span><strong>${documentLabel} Number:</strong></span>
                <span>${documentNumber}</span>
              </div>
              ${dateValue ? `
              <div style="display: flex; justify-content: space-between; padding: 10px 0;">
                <span><strong>${dateLabel}:</strong></span>
                <span>${dateValue}</span>
              </div>` : ''}
            </div>
            ${isInvoice && portalUrl ? `
            <div style="text-align: center; margin: 30px 0;">
              <a href="${portalUrl}" style="display: inline-block; padding: 16px 40px; background: #00E6A0; color: #0f172a; font-weight: 700; font-size: 18px; text-decoration: none; border-radius: 8px;">
                💳 Pay Now
              </a>
              <p style="color: #64748b; font-size: 12px; margin-top: 10px;">Secure payment via card or Apple/Google Pay</p>
            </div>` : ''}
            ${pdfDownloadUrl ? `
            <div style="text-align: center; margin: 20px 0;">
              <a href="${pdfDownloadUrl}" style="display: inline-block; padding: 12px 24px; background: #f1f5f9; color: #0f172a; font-weight: 600; font-size: 14px; text-decoration: none; border-radius: 8px; border: 1px solid #e2e8f0;">
                📎 Download PDF
              </a>
            </div>` : ''}
            <p>If you have any questions, please don't hesitate to reach out.</p>
            <p>Best regards,<br><strong>${fromName}</strong></p>
          </div>
          <div style="text-align: center; padding: 20px; color: #64748b; font-size: 12px; background: #f8fafc; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
            <p>Powered by <a href="#" style="color: #00E6A0; text-decoration: none;">Foreman</a> — Get paid sooner.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const messageId = crypto.randomUUID();

    // Log pending
    await supabase.from("email_send_log").insert({
      message_id: messageId,
      template_name: `document:${documentType}`,
      recipient_email: to,
      status: "pending",
    });

    // Enqueue via Lovable Cloud
    const { error: enqueueError } = await supabase.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        message_id: messageId,
        to,
        from: `${fromName} via Foreman <noreply@${FROM_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject: `${documentLabel} ${documentNumber} from ${fromName}`,
        html,
        text: `${documentLabel} ${documentNumber} from ${fromName} - Total: ${formattedTotal}`,
        purpose: "transactional",
        label: `document:${documentType}`,
        queued_at: new Date().toISOString(),
      },
    });

    if (enqueueError) {
      console.error("Failed to enqueue document email:", enqueueError);
      throw new Error("Failed to enqueue email");
    }

    // Audit log — allowed send
    await supabase.from("comms_audit_log").insert({
      channel: "email", record_type: record_type || documentType,
      record_id: record_id || null, recipient: to,
      template: `send-document-email:${documentType}`,
      manual_send: true, confirmed_by_user: true,
      allowed: true, source_screen: source_screen || null,
    });

    return new Response(JSON.stringify({ success: true, queued: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

Deno.serve(handler);
