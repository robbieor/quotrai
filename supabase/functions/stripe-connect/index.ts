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
    if (!stripeKey) throw new Error("Stripe secret key not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized");

    const userId = user.id;

    // Get org membership (v2)
    const { data: orgMember } = await supabaseClient
      .from("org_members_v2")
      .select("org_id, role, seat_type")
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    if (!orgMember?.org_id) throw new Error("User not in an organization");

    // Check ownership — CEO role is the owner equivalent
    if (orgMember.role !== "ceo" && orgMember.role !== "owner") {
      throw new Error("Only team owners can set up payments");
    }

    // Also get profile for email/company info
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("email, company_name, country")
      .eq("id", userId)
      .single();

    const teamId = orgMember.org_id;

    const { action } = await req.json();
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check existing Connect account
    const { data: team } = await supabaseClient
      .from("teams")
      .select("stripe_connect_account_id, stripe_connect_onboarding_complete")
      .eq("id", teamId)
      .single();

    if (action === "status") {
      // Return current Connect status
      if (!team?.stripe_connect_account_id) {
        return new Response(
          JSON.stringify({ connected: false, onboarding_complete: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const account = await stripe.accounts.retrieve(team.stripe_connect_account_id);
      const isComplete = account.charges_enabled && account.payouts_enabled;

      // Update DB if status changed
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
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "onboard") {
      let accountId = team?.stripe_connect_account_id;

      if (!accountId) {
        // Create a new Connect Express account
        const account = await stripe.accounts.create({
          type: "express",
          email: profile?.email || undefined,
          business_profile: {
            name: profile?.company_name || undefined,
          },
          metadata: {
            team_id: teamId,
            user_id: userId,
          },
        });

        accountId = account.id;

        await supabaseClient
          .from("teams")
          .update({ stripe_connect_account_id: accountId })
          .eq("id", teamId);
      }

      // Create onboarding link
      const origin = req.headers.get("origin") || "https://quotrai.lovable.app";
      const accountLink = await stripe.accountLinks.create({
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

    if (action === "dashboard") {
      if (!team?.stripe_connect_account_id) {
        throw new Error("No Connect account found");
      }

      const loginLink = await stripe.accounts.createLoginLink(
        team.stripe_connect_account_id
      );

      return new Response(
        JSON.stringify({ url: loginLink.url }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Invalid action");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed";
    console.error("Stripe Connect error:", error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
