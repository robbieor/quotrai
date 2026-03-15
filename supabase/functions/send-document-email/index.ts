import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

// Quotr brand colors and styles
const brandStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap');
  
  body { 
    font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
    line-height: 1.6; 
    color: #0f172a; 
    margin: 0;
    padding: 0;
    background-color: #f8fafc;
  }
  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
  .header { 
    background: linear-gradient(135deg, #00FFB2, #00D4FF); 
    padding: 30px 20px; 
    text-align: center; 
    border-radius: 12px 12px 0 0; 
  }
  .header h1 { 
    color: #0f172a; 
    margin: 0; 
    font-size: 24px; 
    font-weight: 700; 
  }
  .logo { 
    font-size: 28px; 
    font-weight: 700; 
    color: #0f172a; 
    margin-bottom: 10px; 
  }
  .content { 
    background: #ffffff; 
    padding: 30px; 
    border: 1px solid #e2e8f0; 
    border-top: none; 
  }
  .amount { 
    font-size: 36px; 
    font-weight: 700; 
    background: linear-gradient(135deg, #00FFB2, #00D4FF);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin: 20px 0; 
    text-align: center;
  }
  .details { 
    background: #f8fafc; 
    padding: 20px; 
    border-radius: 8px; 
    margin: 20px 0; 
  }
  .details-row { 
    display: flex; 
    justify-content: space-between; 
    padding: 10px 0; 
    border-bottom: 1px solid #e2e8f0; 
  }
  .details-row:last-child { border-bottom: none; }
  .footer { 
    text-align: center; 
    padding: 20px; 
    color: #64748b; 
    font-size: 12px; 
    background: #f8fafc;
    border-radius: 0 0 12px 12px;
    border: 1px solid #e2e8f0;
    border-top: none;
  }
  .footer a { color: #00D4FF; text-decoration: none; }
`;

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // ──────────────────────────────────────────────────────────
  // COMMUNICATION SAFETY: Global kill switch
  // ──────────────────────────────────────────────────────────
  const outboundEnabled = Deno.env.get("OUTBOUND_COMMUNICATION_ENABLED") === "true";

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { 
      to, 
      customerName, 
      documentType, 
      documentNumber, 
      total, 
      dueDate,
      validUntil,
      fromName,
      pdfBase64,
      portalUrl,
      manual_send,
      confirmed_by_user,
      source_screen,
      record_type,
      record_id,
    }: EmailRequest = await req.json();

    // ──────────────────────────────────────────────────────────
    // COMMUNICATION SAFETY: Require manual_send + confirmed_by_user
    // ──────────────────────────────────────────────────────────
    if (!manual_send || !confirmed_by_user) {
      // Log blocked attempt
      await supabase.from("comms_audit_log").insert({
        channel: "email",
        record_type: record_type || documentType,
        record_id: record_id || null,
        recipient: to,
        template: `send-document-email:${documentType}`,
        manual_send: manual_send || false,
        confirmed_by_user: confirmed_by_user || false,
        allowed: false,
        blocked_reason: "Missing manual_send or confirmed_by_user flag",
        source_screen: source_screen || null,
      });

      return new Response(
        JSON.stringify({ error: "Send blocked: manual_send and confirmed_by_user required" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!outboundEnabled) {
      // Log blocked attempt
      await supabase.from("comms_audit_log").insert({
        channel: "email",
        record_type: record_type || documentType,
        record_id: record_id || null,
        recipient: to,
        template: `send-document-email:${documentType}`,
        manual_send: true,
        confirmed_by_user: true,
        allowed: false,
        blocked_reason: "OUTBOUND_COMMUNICATION_ENABLED is false",
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

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    const formattedTotal = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(total);

    const isInvoice = documentType === "invoice";
    const documentLabel = isInvoice ? "Invoice" : "Quote";
    const dateLabel = isInvoice ? "Due Date" : "Valid Until";
    const dateValue = isInvoice ? dueDate : validUntil;

    const attachments = pdfBase64 ? [{
      filename: `${documentNumber}.pdf`,
      content: pdfBase64,
    }] : [];

    const emailResponse = await resend.emails.send({
      from: `${fromName} via Quotr <noreply@quotr.info>`,
      to: [to],
      subject: `${documentLabel} ${documentNumber} from ${fromName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>${brandStyles}</style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">Quotr</div>
              <h1>${documentLabel} ${documentNumber}</h1>
            </div>
            <div class="content">
              <p>Dear ${customerName},</p>
              <p>${isInvoice 
                ? "Please find your invoice details below. Thank you for your business!" 
                : "Please find your quote details below. We look forward to working with you!"}
              </p>
              
              <div class="amount">${formattedTotal}</div>
              
              <div class="details">
                <div class="details-row">
                  <span><strong>${documentLabel} Number:</strong></span>
                  <span>${documentNumber}</span>
                </div>
                ${dateValue ? `
                <div class="details-row">
                  <span><strong>${dateLabel}:</strong></span>
                  <span>${dateValue}</span>
                </div>
                ` : ''}
              </div>
              
              ${isInvoice && portalUrl ? `
              <div style="text-align: center; margin: 30px 0;">
                <a href="${portalUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #00FFB2, #00D4FF); color: #0f172a; font-weight: 700; font-size: 18px; text-decoration: none; border-radius: 8px;">
                  💳 Pay Now
                </a>
                <p style="color: #64748b; font-size: 12px; margin-top: 10px;">Secure payment via card or Apple/Google Pay</p>
              </div>
              ` : ''}
              
              ${pdfBase64 ? '<p style="text-align: center; color: #64748b;">📎 A PDF copy is attached to this email for your records.</p>' : ''}
              
              <p>If you have any questions, please don't hesitate to reach out.</p>
              
              <p>Best regards,<br><strong>${fromName}</strong></p>
            </div>
            <div class="footer">
              <p>Powered by <a href="#">Quotr</a> — Get paid sooner.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      attachments,
    });

    console.log("Email sent successfully:", emailResponse);

    // ──────────────────────────────────────────────────────────
    // COMMUNICATION SAFETY: Audit log — allowed send
    // ──────────────────────────────────────────────────────────
    await supabase.from("comms_audit_log").insert({
      channel: "email",
      record_type: record_type || documentType,
      record_id: record_id || null,
      recipient: to,
      template: `send-document-email:${documentType}`,
      manual_send: true,
      confirmed_by_user: true,
      allowed: true,
      source_screen: source_screen || null,
    });

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
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
