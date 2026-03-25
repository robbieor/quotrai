import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Stripe Price IDs (already configured in Stripe)
const STRIPE_PRICES: Record<string, Record<string, string>> = {
  lite: {
    month: "price_1TEa4dDQETj2awNErpoa1vHM",
    year: "price_1TEa57DQETj2awNEESev15XR",
  },
  connect: {
    month: "price_1TEa5SDQETj2awNE4qhL4fa7",
    year: "price_1TEa5tDQETj2awNE2zfrsMkY",
  },
  grow: {
    month: "price_1TEa6HDQETj2awNEycXwPCfc",
    year: "price_1TEa6oDQETj2awNEHSl42OYl",
  },
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
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    // Get user's org via v2
    const { data: orgMember } = await supabaseClient
      .from("org_members_v2")
      .select("org_id, role")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!orgMember?.org_id) throw new Error("User not in an organization");

    const body = await req.json().catch(() => ({}));
    const { seatCounts, interval = "month", isUpgrade = false } = body;
    const billingInterval: "month" | "year" = interval === "year" ? "year" : "month";

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Build line items from seat counts, or from org members if not provided
    let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    if (seatCounts && typeof seatCounts === "object") {
      // Explicit seat counts from checkout (e.g., first subscription)
      for (const [seatType, qty] of Object.entries(seatCounts)) {
        const count = Number(qty);
        if (count <= 0) continue;
        const priceId = STRIPE_PRICES[seatType]?.[billingInterval];
        if (!priceId) continue;
        lineItems.push({ price: priceId, quantity: count });
      }
    } else {
      // Default: count seats from org_members_v2
      const { data: members } = await supabaseClient
        .from("org_members_v2")
        .select("seat_type")
        .eq("org_id", orgMember.org_id)
        .eq("status", "active");

      const counts: Record<string, number> = {};
      (members || []).forEach((m: { seat_type: string }) => {
        counts[m.seat_type] = (counts[m.seat_type] || 0) + 1;
      });

      // Default to at least 1 connect seat if no members
      if (Object.keys(counts).length === 0) {
        counts["connect"] = 1;
      }

      for (const [seatType, count] of Object.entries(counts)) {
        const priceId = STRIPE_PRICES[seatType]?.[billingInterval];
        if (!priceId) continue;
        lineItems.push({ price: priceId, quantity: count });
      }
    }

    if (lineItems.length === 0) {
      // Fallback: 1 connect seat
      lineItems = [{ price: STRIPE_PRICES.connect[billingInterval], quantity: 1 }];
    }

    // Get or create Stripe customer
    let stripeCustomerId: string;
    const { data: subscription } = await supabaseClient
      .from("subscriptions_v2")
      .select("stripe_customer_id, stripe_subscription_id")
      .eq("org_id", orgMember.org_id)
      .maybeSingle();

    if (subscription?.stripe_customer_id) {
      stripeCustomerId = subscription.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { org_id: orgMember.org_id, user_id: user.id },
      });
      stripeCustomerId = customer.id;

      // Upsert subscription record
      await supabaseClient
        .from("subscriptions_v2")
        .upsert({
          org_id: orgMember.org_id,
          stripe_customer_id: stripeCustomerId,
          status: "pending",
          seat_count: lineItems.reduce((sum, li) => sum + (li.quantity || 1), 0),
        }, { onConflict: "org_id" });
    }

    const origin = req.headers.get("origin") || "http://localhost:5173";

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

    // Create checkout session with multi-line items
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      line_items: lineItems,
      mode: "subscription",
      success_url: `${origin}/settings?tab=billing&success=true`,
      cancel_url: `${origin}/settings?tab=billing&cancelled=true`,
      subscription_data: {
        trial_period_days: isUpgrade ? 0 : 14,
        metadata: { org_id: orgMember.org_id },
      },
      billing_address_collection: "required",
      payment_method_collection: "always",
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
