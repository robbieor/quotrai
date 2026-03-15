import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // ──────────────────────────────────────────────────────────
  // COMMUNICATION SAFETY: Global kill switch
  // ──────────────────────────────────────────────────────────
  const outboundEnabled = Deno.env.get("OUTBOUND_COMMUNICATION_ENABLED") === "true";
  if (!outboundEnabled) {
    console.log("[SAFETY] check-churn blocked: OUTBOUND_COMMUNICATION_ENABLED is false");
    return new Response(JSON.stringify({ sent: 0, blocked: true, reason: "kill_switch" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "No RESEND_API_KEY" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, full_name, team_id, updated_at")
      .not("email", "is", null)
      .lt("updated_at", sevenDaysAgo)
      .limit(50);

    if (profileError) throw profileError;
    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sentCount = 0;

    for (const profile of profiles) {
      if (!profile.email || !profile.team_id) continue;

      const { data: recentChurn } = await supabase
        .from("churn_events")
        .select("id")
        .eq("user_id", profile.id)
        .gte("created_at", fourteenDaysAgo)
        .limit(1);

      if (recentChurn && recentChurn.length > 0) continue;

      const { count: jobCount } = await supabase
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .eq("team_id", profile.team_id)
        .gte("created_at", sevenDaysAgo);

      const { count: invoiceCount } = await supabase
        .from("invoices")
        .select("*", { count: "exact", head: true })
        .eq("team_id", profile.team_id)
        .gte("created_at", sevenDaysAgo);

      if ((jobCount || 0) > 0 || (invoiceCount || 0) > 0) continue;

      const firstName = profile.full_name?.split(" ")[0] || "there";

      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "Quotr <noreply@quotr.info>",
            to: [profile.email],
            subject: `${firstName}, we miss you on Quotr! 🛠️`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Hey ${firstName},</h2>
                <p>We noticed you haven't been on Quotr recently. Your business doesn't stop — and neither should your quoting and invoicing.</p>
                
                <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin: 20px 0; border-radius: 4px;">
                  <p style="margin: 0; font-weight: bold;">Quick wins waiting for you:</p>
                  <ul style="margin: 8px 0 0 0; padding-left: 20px;">
                    <li>Create quotes in seconds with templates</li>
                    <li>Send invoices and get paid faster</li>
                    <li>Track your jobs and never miss an appointment</li>
                  </ul>
                </div>

                <a href="https://quotrai.lovable.app/dashboard" 
                   style="display: inline-block; background: #00FFB2; color: #000; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin: 16px 0;">
                  Jump Back In →
                </a>

                <p style="color: #666; font-size: 14px; margin-top: 24px;">
                  Need help? Chat with George, your AI assistant, anytime.
                </p>
              </div>
            `,
          }),
        });

        await supabase.from("churn_events").insert({
          team_id: profile.team_id,
          user_id: profile.id,
          event_type: "reengagement_email",
          email_sent: true,
          sent_at: new Date().toISOString(),
        });

        sentCount++;
      } catch (e) {
        console.error("Failed to send churn email:", e);
      }
    }

    return new Response(JSON.stringify({ sent: sentCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
