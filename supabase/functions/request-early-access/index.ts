import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EarlyAccessRequest {
  companyName: string;
  contactName: string;
  email: string;
  phone?: string;
  tradeType?: string;
  teamSize?: string;
  country?: string;
  message?: string;
}

// HTML escape function to prevent XSS
function escapeHtml(text: string | undefined | null): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyName, contactName, email, phone, tradeType, teamSize, country, message }: EarlyAccessRequest = await req.json();

    // Validate required fields
    if (!companyName || !contactName || !email) {
      return new Response(
        JSON.stringify({ error: "Company name, contact name, and email are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Sanitize all user inputs for HTML templates
    const safeCompanyName = escapeHtml(companyName);
    const safeContactName = escapeHtml(contactName);
    const safeEmail = escapeHtml(email);
    const safePhone = escapeHtml(phone);
    const safeTradeType = escapeHtml(tradeType);
    const safeTeamSize = escapeHtml(teamSize);
    const safeCountry = escapeHtml(country);
    const safeMessage = escapeHtml(message);

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Save to database
    const { data: savedRequest, error: dbError } = await supabase
      .from("early_access_requests")
      .insert({
        company_name: companyName,
        contact_name: contactName,
        email: email,
        phone: phone || null,
        trade_type: tradeType || null,
        team_size: teamSize || null,
        country: country || null,
        message: message || null,
        status: "pending"
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      return new Response(
        JSON.stringify({ error: "Failed to save request" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send notification email to accounts@quotr.info
    const adminEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #00FFB2 0%, #00D4FF 100%); padding: 30px; text-align: center; }
          .header h1 { color: #0a0a0a; margin: 0; font-size: 24px; }
          .content { padding: 30px; }
          .field { margin-bottom: 16px; }
          .field-label { font-weight: 600; color: #374151; font-size: 14px; margin-bottom: 4px; }
          .field-value { color: #111827; font-size: 16px; padding: 10px; background-color: #f9fafb; border-radius: 6px; }
          .message-box { background-color: #f0fdf4; border-left: 4px solid #00FFB2; padding: 16px; margin-top: 20px; }
          .footer { padding: 20px 30px; background-color: #f9fafb; text-align: center; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚀 New Early Access Request</h1>
          </div>
          <div class="content">
            <div class="field">
              <div class="field-label">Company Name</div>
              <div class="field-value">${safeCompanyName}</div>
            </div>
            <div class="field">
              <div class="field-label">Contact Name</div>
              <div class="field-value">${safeContactName}</div>
            </div>
            <div class="field">
              <div class="field-label">Email</div>
              <div class="field-value"><a href="mailto:${safeEmail}">${safeEmail}</a></div>
            </div>
            ${safePhone ? `
            <div class="field">
              <div class="field-label">Phone</div>
              <div class="field-value"><a href="tel:${safePhone}">${safePhone}</a></div>
            </div>
            ` : ""}
            ${safeTradeType ? `
            <div class="field">
              <div class="field-label">Trade Type</div>
              <div class="field-value">${safeTradeType}</div>
            </div>
            ` : ""}
            ${safeTeamSize ? `
            <div class="field">
              <div class="field-label">Team Size</div>
              <div class="field-value">${safeTeamSize}</div>
            </div>
            ` : ""}
            ${safeCountry ? `
            <div class="field">
              <div class="field-label">Country</div>
              <div class="field-value">${safeCountry}</div>
            </div>
            ` : ""}
            ${safeMessage ? `
            <div class="message-box">
              <div class="field-label">Message</div>
              <p style="margin: 8px 0 0 0; color: #111827;">${safeMessage}</p>
            </div>
            ` : ""}
          </div>
          <div class="footer">
            Request ID: ${savedRequest.id}<br>
            Submitted: ${new Date().toLocaleString("en-GB", { timeZone: "Europe/London" })}
          </div>
        </div>
      </body>
      </html>
    `;

    // Send to admin
    await resend.emails.send({
      from: "Quotr <notifications@quotr.info>",
      to: ["accounts@quotr.info"],
      subject: `New Early Access Request: ${safeCompanyName}`,
      html: adminEmailHtml,
    });

    // Send confirmation to requester
    const confirmationEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #00FFB2 0%, #00D4FF 100%); padding: 40px 30px; text-align: center; }
          .header h1 { color: #0a0a0a; margin: 0 0 8px 0; font-size: 28px; }
          .header p { color: #1f2937; margin: 0; font-size: 16px; }
          .content { padding: 40px 30px; }
          .content h2 { color: #111827; margin: 0 0 16px 0; font-size: 20px; }
          .content p { color: #4b5563; line-height: 1.6; margin: 0 0 16px 0; }
          .highlight { background-color: #f0fdf4; border-radius: 8px; padding: 20px; margin: 24px 0; }
          .highlight p { margin: 0; color: #065f46; }
          .footer { padding: 24px 30px; background-color: #f9fafb; text-align: center; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to the Quotr Beta! 🎉</h1>
            <p>Your request has been received</p>
          </div>
          <div class="content">
            <h2>Hi ${safeContactName},</h2>
            <p>Thank you for your interest in Quotr and Tom, your AI Foreman assistant!</p>
            <p>We've received your early access request for <strong>${safeCompanyName}</strong>. Our team will review your application and be in touch within <strong>24-48 hours</strong> with pricing details and next steps.</p>
            <div class="highlight">
              <p>💡 <strong>What happens next?</strong><br>
              We'll personally set up your account, walk you through the platform, and ensure you're ready to start saving hours on admin work.</p>
            </div>
            <p>In the meantime, if you have any questions, simply reply to this email — we'd love to hear from you.</p>
            <p>Looking forward to having you on board!</p>
            <p style="margin-top: 24px;"><strong>The Quotr Team</strong></p>
          </div>
          <div class="footer">
            © ${new Date().getFullYear()} Quotr. All rights reserved.<br>
            <a href="https://quotr.info" style="color: #00D4FF;">quotr.info</a>
          </div>
        </div>
      </body>
      </html>
    `;

    await resend.emails.send({
      from: "Quotr <hello@quotr.info>",
      to: [email],
      subject: "Welcome to the Quotr Beta Waitlist! 🚀",
      html: confirmationEmailHtml,
    });

    console.log("Early access request processed successfully:", savedRequest.id);

    return new Response(
      JSON.stringify({ success: true, message: "Request submitted successfully" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: unknown) {
    console.error("Error processing early access request:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred processing your request" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
