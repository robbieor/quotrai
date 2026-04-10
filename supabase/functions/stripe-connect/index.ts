import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "npm:stripe@18.6.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Stripe Client ---
    // Uses STRIPE_SECRET_KEY from environment. SDK auto-selects latest API version.
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not configured. Add it in your project secrets.");
    const stripeClient = new Stripe(stripeKey);

    // --- Supabase service client for DB access ---
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // --- Authenticate calling user ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized");
    const userId = user.id;

    // --- Resolve user's role from org membership ---
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

    // --- Fetch existing team record for Connect account ID ---
    const { data: team } = await supabaseClient
      .from("teams")
      .select("stripe_connect_account_id, stripe_connect_onboarding_complete")
      .eq("id", teamId)
      .single();

    // ========================================================
    // ACTION: status — Return current Connect onboarding state
    // Uses V2 accounts.retrieve with include for requirements
    // ========================================================
    if (action === "status") {
      if (!team?.stripe_connect_account_id) {
        return new Response(
          JSON.stringify({ connected: false, onboarding_complete: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // V2 account retrieve with merchant config + requirements
      const account = await stripeClient.v2.core.accounts.retrieve(
        team.stripe_connect_account_id,
        { include: ["configuration.merchant", "requirements"] }
      );

      // Check if card_payments capability is active
      const cardPaymentsStatus = account?.configuration?.merchant?.capabilities?.card_payments?.status;
      const readyToProcessPayments = cardPaymentsStatus === "active";

      // Check requirements status — onboarding is complete when no currently_due or past_due items
      const requirementsStatus = account?.requirements?.summary?.minimum_deadline?.status;
      const onboardingComplete = requirementsStatus !== "currently_due" && requirementsStatus !== "past_due";

      const isComplete = readyToProcessPayments && onboardingComplete;

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
          charges_enabled: readyToProcessPayments,
          requirements_status: requirementsStatus,
          details_submitted: onboardingComplete,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========================================================
    // ACTION: onboard — Create V2 account + account link
    // ========================================================
    if (action === "onboard") {
      let accountId = team?.stripe_connect_account_id;

      if (!accountId) {
        // Create a new V2 Connected Account
        // No top-level `type` — V2 uses configuration-based setup
        const account = await stripeClient.v2.core.accounts.create({
          display_name: profile?.company_name || "My Business",
          contact_email: profile?.email || user.email || undefined,
          identity: {
            country: (profile?.country || "ie").toLowerCase(),
          },
          // Full dashboard gives the connected account access to their own Stripe dashboard
          dashboard: "full",
          defaults: {
            responsibilities: {
              // Stripe collects fees and manages losses — simplest for platforms
              fees_collector: "stripe",
              losses_collector: "stripe",
            },
          },
          configuration: {
            // Customer configuration enables the account to have customers
            customer: {},
            merchant: {
              capabilities: {
                card_payments: {
                  requested: true,
                },
              },
            },
          },
        });

        accountId = account.id;

        // Store the V2 account ID in the teams table
        await supabaseClient
          .from("teams")
          .update({ stripe_connect_account_id: accountId })
          .eq("id", teamId);
      }

      // Create V2 Account Link for onboarding
      const origin = req.headers.get("origin") || "https://foreman.world";
      const accountLink = await stripeClient.v2.core.accountLinks.create({
        account: accountId,
        use_case: {
          type: "account_onboarding",
          account_onboarding: {
            // Onboard both merchant (accept payments) and customer (subscribe) configs
            configurations: ["merchant", "customer"],
            refresh_url: `${origin}/settings?tab=billing&connect=refresh`,
            return_url: `${origin}/settings?tab=billing&connect=complete`,
          },
        },
      });

      return new Response(
        JSON.stringify({ url: accountLink.url }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========================================================
    // ACTION: dashboard — Generate a login link for the connected account's dashboard
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
