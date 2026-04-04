import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// New single-plan pricing: €39 base (3 users) + €19/extra seat
const PRICES = {
  month: {
    base: "price_1TIJDeDQETj2awNEWxP4bB43",   // €39/mo
    seat: "price_1TIJDzDQETj2awNEtiMhRUPR",   // €19/mo
  },
  year: {
    base: "price_1TIQvfDQETj2awNEx7bAyHjy",   // €397.80/yr (15% off)
    seat: "price_1TIQw1DQETj2awNEth2a6E8y",   // €193.80/yr (15% off)
  },
};
const BASE_USERS = 3;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const logStep = (s: string, d?: any) => console.log(`[CHECKOUT] ${s}`, d || "");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Stripe secret key not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    // Get user's org
    const { data: orgMember } = await supabaseClient
      .from("org_members_v2")
      .select("org_id, role")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!orgMember?.org_id) throw new Error("User not in an organization");

    const body = await req.json().catch(() => ({}));
    const { teamSize = 1, interval = "month", isUpgrade = false, skipTrial = false } = body;
    const seatCount = Math.max(1, Number(teamSize) || 1);
    const billingInterval = interval === "year" ? "year" : "month";
    const priceSet = PRICES[billingInterval];

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Build line items: 1× base plan + extra seats if > 3 users
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      { price: priceSet.base, quantity: 1 },
    ];

    const extraSeats = Math.max(0, seatCount - BASE_USERS);
    if (extraSeats > 0) {
      lineItems.push({ price: priceSet.seat, quantity: extraSeats });
    }

    logStep("Line items built", { seatCount, extraSeats, billingInterval, lineItems: lineItems.length });

    // Get or create Stripe customer
    let stripeCustomerId: string;
    const { data: subscription } = await supabaseClient
      .from("subscriptions_v2")
      .select("stripe_customer_id, stripe_subscription_id, trial_ends_at")
      .eq("org_id", orgMember.org_id)
      .maybeSingle();

    if (subscription?.stripe_customer_id) {
      stripeCustomerId = subscription.stripe_customer_id;
    } else {
      const existingCustomers = await stripe.customers.list({ email: user.email!, limit: 1 });
      if (existingCustomers.data.length > 0) {
        stripeCustomerId = existingCustomers.data[0].id;
        logStep("Reusing existing Stripe customer", { customerId: stripeCustomerId });
      } else {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { org_id: orgMember.org_id, user_id: user.id },
        });
        stripeCustomerId = customer.id;
        logStep("Created new Stripe customer", { customerId: stripeCustomerId });
      }

      await supabaseClient
        .from("subscriptions_v2")
        .upsert({
          org_id: orgMember.org_id,
          stripe_customer_id: stripeCustomerId,
          status: "pending",
          seat_count: seatCount,
          billing_period: billingInterval,
        }, { onConflict: "org_id" });
    }

    const origin = req.headers.get("origin") || "http://localhost:5173";

    // Check burned_accounts for repeat trial abuse
    let trialDays = 14;
    if (!isUpgrade && user.email) {
      const encoder = new TextEncoder();
      const data = encoder.encode(user.email.toLowerCase().trim());
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const emailHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

      const { data: burned } = await supabaseClient
        .from("burned_accounts")
        .select("id")
        .or(`email.eq.${user.email.toLowerCase().trim()},email.eq.${emailHash}`)
        .limit(1);

      if (burned && burned.length > 0) {
        trialDays = 0;
        logStep("Burned account detected, no trial", { email: user.email });
      }
    }

    const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData = {
      metadata: { org_id: orgMember.org_id },
    };

    // Preserve any remaining in-app trial
    if (!isUpgrade && subscription?.trial_ends_at) {
      const trialEnd = new Date(subscription.trial_ends_at);
      if (!Number.isNaN(trialEnd.getTime()) && trialEnd.getTime() > Date.now()) {
        subscriptionData.trial_end = Math.floor(trialEnd.getTime() / 1000);
        logStep("Preserving existing trial", { trial_ends_at: subscription.trial_ends_at });
      } else {
        trialDays = 0;
        logStep("Previous trial already expired", { trial_ends_at: subscription.trial_ends_at });
      }
    } else if (!isUpgrade && trialDays > 0) {
      subscriptionData.trial_period_days = trialDays;
    }

    // If upgrading with existing subscription, go to portal
    if (subscription?.stripe_subscription_id && isUpgrade) {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: `${origin}/settings?tab=billing`,
      });
      return new Response(
        JSON.stringify({ url: portalSession.url }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Apply bulk discount coupon for 5+ seats
    const discounts: Stripe.Checkout.SessionCreateParams.Discount[] = [];
    if (seatCount >= 5) {
      discounts.push({ coupon: "wuUUykGN" });
      logStep("Bulk discount applied", { seatCount });
    }

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      line_items: lineItems,
      mode: "subscription",
      success_url: `${origin}/subscription-confirmed?plan=foreman&seats=${seatCount}&interval=${billingInterval}`,
      cancel_url: `${origin}/select-plan`,
      subscription_data: subscriptionData,
      billing_address_collection: "required",
      payment_method_collection: "always",
      ...(discounts.length > 0 ? { discounts } : {}),
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create checkout session";
    console.error("Error creating checkout session:", error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
