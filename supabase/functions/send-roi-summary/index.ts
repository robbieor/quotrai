import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ROISummaryRequest {
  email: string;
  name: string;
  teamSize: number;
  adminHoursPerWeek: number;
  voiceUsers: number;
  monthlyNetSavings: number;
  annualSavings: number;
  roiMultiple: number;
  hoursSavedPerMonth: number;
  adminHeadcountEquivalent: number;
  quotrMonthlyCost: number;
}

function sanitizeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatCurrency(amount: number, currency: string = "£"): string {
  return `${currency}${Math.round(amount).toLocaleString("en-GB")}`;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: ROISummaryRequest = await req.json();

    if (!data.email || !data.email.includes("@")) {
      return new Response(
        JSON.stringify({ error: "Valid email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const safeName = sanitizeHtml(data.name || "there");
    const firstName = safeName.split(" ")[0];

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Quotr ROI Summary</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb 0%, #14b8a6 100%); padding: 40px 40px 30px;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                Your Quotr ROI Summary
              </h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
                Hey ${firstName}, here's what you could save with Quotr
              </p>
            </td>
          </tr>

          <!-- Main Savings Highlight -->
          <tr>
            <td style="padding: 40px;">
              <div style="background: linear-gradient(135deg, #eff6ff 0%, #f0fdfa 100%); border-radius: 12px; padding: 30px; text-align: center; border: 1px solid #e0f2fe;">
                <p style="margin: 0 0 8px; color: #64748b; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">
                  Your Potential Monthly Savings
                </p>
                <p style="margin: 0; color: #2563eb; font-size: 48px; font-weight: 800;">
                  ${formatCurrency(data.monthlyNetSavings)}
                </p>
                <p style="margin: 12px 0 0; color: #64748b; font-size: 14px;">
                  That's <strong style="color: #14b8a6;">${formatCurrency(data.annualSavings)}/year</strong> back in your pocket
                </p>
              </div>
            </td>
          </tr>

          <!-- Stats Grid -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td width="50%" style="padding-right: 10px;">
                    <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; text-align: center;">
                      <p style="margin: 0; color: #2563eb; font-size: 32px; font-weight: 700;">
                        ${data.roiMultiple.toFixed(1)}x
                      </p>
                      <p style="margin: 5px 0 0; color: #64748b; font-size: 13px;">
                        Return on Investment
                      </p>
                    </div>
                  </td>
                  <td width="50%" style="padding-left: 10px;">
                    <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; text-align: center;">
                      <p style="margin: 0; color: #2563eb; font-size: 32px; font-weight: 700;">
                        ${Math.round(data.hoursSavedPerMonth)}
                      </p>
                      <p style="margin: 5px 0 0; color: #64748b; font-size: 13px;">
                        Hours Saved/Month
                      </p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Your Configuration -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <h2 style="margin: 0 0 20px; color: #1e293b; font-size: 18px; font-weight: 600;">
                Based on your team
              </h2>
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                <tr>
                  <td style="padding: 15px 20px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 14px;">
                    Team Size
                  </td>
                  <td style="padding: 15px 20px; border-bottom: 1px solid #e2e8f0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">
                    ${data.teamSize} ${data.teamSize === 1 ? "person" : "people"}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 15px 20px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 14px;">
                    Admin Hours/Week
                  </td>
                  <td style="padding: 15px 20px; border-bottom: 1px solid #e2e8f0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">
                    ${data.adminHoursPerWeek} hours per person
                  </td>
                </tr>
                <tr>
                  <td style="padding: 15px 20px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 14px;">
                    Tom Voice Users
                  </td>
                  <td style="padding: 15px 20px; border-bottom: 1px solid #e2e8f0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">
                    ${data.voiceUsers} ${data.voiceUsers === 1 ? "user" : "users"}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 15px 20px; color: #64748b; font-size: 14px;">
                    Admin Staff Equivalent Saved
                  </td>
                  <td style="padding: 15px 20px; color: #14b8a6; font-size: 14px; font-weight: 600; text-align: right;">
                    ${data.adminHeadcountEquivalent.toFixed(1)} FTE
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Cost Breakdown -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <h2 style="margin: 0 0 20px; color: #1e293b; font-size: 18px; font-weight: 600;">
                Simple investment, big returns
              </h2>
              <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px;">
                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td style="padding: 8px 0; color: #64748b; font-size: 14px;">
                      Your Quotr subscription
                    </td>
                    <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">
                      €${data.quotrMonthlyCost}/month
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b; font-size: 14px;">
                      Admin time saved
                    </td>
                    <td style="padding: 8px 0; color: #14b8a6; font-size: 14px; font-weight: 600; text-align: right;">
                      +${formatCurrency(data.monthlyNetSavings + data.quotrMonthlyCost)}/month
                    </td>
                  </tr>
                  <tr>
                    <td colspan="2" style="padding-top: 12px; border-top: 1px dashed #e2e8f0;">
                      <table cellpadding="0" cellspacing="0" border="0" width="100%">
                        <tr>
                          <td style="padding-top: 12px; color: #1e293b; font-size: 16px; font-weight: 600;">
                            Net monthly benefit
                          </td>
                          <td style="padding-top: 12px; color: #2563eb; font-size: 18px; font-weight: 700; text-align: right;">
                            ${formatCurrency(data.monthlyNetSavings)}
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding: 0 40px 40px; text-align: center;">
              <a href="https://quotrai.lovable.app/request-access" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3);">
                Get Early Access →
              </a>
              <p style="margin: 16px 0 0; color: #94a3b8; font-size: 13px;">
                Free during beta • No credit card required
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 30px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 10px; color: #64748b; font-size: 14px;">
                <strong style="color: #1e293b;">Quotr</strong> — Powered by Tom AI
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                The complete platform for trade businesses in the UK & Ireland
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Quotr <onboarding@resend.dev>",
        to: [data.email],
        subject: `${firstName}, you could save ${formatCurrency(data.monthlyNetSavings)}/month with Quotr`,
        html: emailHtml,
      }),
    });

    const emailResult = await emailResponse.json();
    console.log("ROI summary email sent:", emailResult);

    if (!emailResponse.ok) {
      throw new Error(emailResult.message || "Failed to send email");
    }

    return new Response(
      JSON.stringify({ success: true, id: emailResult.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error sending ROI summary:", error);
    const message = error instanceof Error ? error.message : "Failed to send email";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
