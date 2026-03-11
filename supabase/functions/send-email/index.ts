import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[SEND-EMAIL] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    // Authenticate user
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData.user) throw new Error("Unauthorized");

    const { to, subject, html, from, replyTo } = await req.json();
    if (!to || !subject || !html) {
      throw new Error("Missing required fields: to, subject, html");
    }

    logStep("Sending email", { to, subject });

    // Get branding for from address if not specified
    let fromAddress = from;
    if (!fromAddress) {
      // Get user's team branding
      const { data: profile } = await supabase
        .from("profiles")
        .select("team_id")
        .eq("id", userData.user.id)
        .single();

      if (profile?.team_id) {
        const { data: branding } = await supabase
          .from("company_branding")
          .select("company_name, company_email")
          .eq("team_id", profile.team_id)
          .single();

        if (branding?.company_name) {
          fromAddress = `${branding.company_name} <noreply@quotr.ie>`;
        }
      }
      if (!fromAddress) fromAddress = "Quotr <noreply@quotr.ie>";
    }

    const emailPayload: any = {
      from: fromAddress,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    };
    if (replyTo) emailPayload.reply_to = replyTo;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    const result = await res.json();
    if (!res.ok) {
      logStep("Resend error", result);
      throw new Error(result.message || "Failed to send email");
    }

    logStep("Email sent", { id: result.id });

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
