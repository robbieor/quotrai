import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not configured. Add it in your project secrets.");
    const trimmedKey = stripeKey.trim();
    if (trimmedKey.startsWith("pk_")) {
      throw new Error("STRIPE_SECRET_KEY is a publishable key (pk_). Stripe Connect requires the full Secret key (sk_live_ or sk_test_).");
    }
    if (trimmedKey.startsWith("rk_")) {
      throw new Error("STRIPE_SECRET_KEY is a restricted key (rk_). Stripe Connect requires the full Secret key (sk_live_ or sk_test_) — restricted keys cannot manage Connect accounts.");
    }
    if (!trimmedKey.startsWith("sk_test_") && !trimmedKey.startsWith("sk_live_")) {
      throw new Error(`STRIPE_SECRET_KEY has an invalid format. Expected sk_live_ or sk_test_, got: ${trimmedKey.substring(0, 8)}...`);
    }
    const stripeClient = new Stripe(trimmedKey, { apiVersion: "2025-08-27.basil" });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate calling user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized");
    const userId = user.id;

    // Resolve user's role from org membership
    const { data: orgMembers } = await supabaseClient
      .from("org_members_v2")
      .select("org_id, role, seat_type")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(1);
    const orgMember = orgMembers?.[0];

    // Only owners/CEOs can manage Connect
    if (orgMember && orgMember.role !== "ceo" && orgMember.role !== "owner") {
      throw new Error("Only team owners can set up payments");
    }

    // Fetch profile for email/company info AND the correct team_id
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("email, company_name, country, team_id")
      .eq("id", userId)
      .single();

    if (!profile?.team_id) throw new Error("User not associated with a team");

    const teamId = profile.team_id;
    const { action } = await req.json();

    // Fetch existing team record for Connect account ID
    const { data: team } = await supabaseClient
      .from("teams")
      .select("stripe_connect_account_id, stripe_connect_onboarding_complete")
      .eq("id", teamId)
      .single();

    // ========================================================
    // ACTION: status
    // ========================================================
    if (action === "status") {
      if (!team?.stripe_connect_account_id) {
        return new Response(
          JSON.stringify({ connected: false, onboarding_complete: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const account = await stripeClient.accounts.retrieve(team.stripe_connect_account_id);

      const chargesEnabled = account.charges_enabled || false;
      const detailsSubmitted = account.details_submitted || false;
      const isComplete = chargesEnabled && detailsSubmitted;

      // Sync status back to DB if changed
      if (isComplete !== team.stripe_connect_onboarding_complete) {
        await supabaseClient
          .from("teams")
          .update({ stripe_connect_onboarding_complete: isComplete })
          .eq("id", teamId);
      }

      return new Response(
        JSON.stringify({
          connected: true,
          onboarding_complete: isComplete,
          charges_enabled: chargesEnabled,
          details_submitted: detailsSubmitted,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========================================================
    // ACTION: onboard
    // ========================================================
    if (action === "onboard") {
      let accountId = team?.stripe_connect_account_id;

      if (!accountId) {
        const account = await stripeClient.accounts.create({
          type: "express",
          country: (profile?.country || "IE").toUpperCase(),
          email: profile?.email || user.email || undefined,
          business_profile: {
            name: profile?.company_name || "My Business",
          },
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
        });

        accountId = account.id;

        await supabaseClient
          .from("teams")
          .update({ stripe_connect_account_id: accountId })
          .eq("id", teamId);
      }

      const origin = req.headers.get("origin") || "https://revamo.ai";
      const accountLink = await stripeClient.accountLinks.create({
        account: accountId,
        refresh_url: `${origin}/settings?tab=billing&connect=refresh`,
        return_url: `${origin}/settings?tab=billing&connect=complete`,
        type: "account_onboarding",
      });

      return new Response(
        JSON.stringify({ url: accountLink.url }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========================================================
    // ACTION: dashboard
    // ========================================================
    if (action === "dashboard") {
      if (!team?.stripe_connect_account_id) {
        throw new Error("No Connect account found");
      }

      const loginLink = await stripeClient.accounts.createLoginLink(
        team.stripe_connect_account_id
      );

      return new Response(
        JSON.stringify({ url: loginLink.url }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Invalid action. Supported: status, onboard, dashboard");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed";
    console.error("Stripe Connect error:", error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
