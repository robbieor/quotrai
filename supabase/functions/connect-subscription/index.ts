import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

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
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not configured.");
    const stripeClient = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const { action, accountId, priceId } = await req.json();
    const origin = req.headers.get("origin") || "https://revamo.ai";

    // ========================================================
    // ACTION: checkout — Create a subscription checkout for a connected account
    // Uses customer_account (V2 pattern) instead of customer
    // The connected account ID serves as both the customer and account identifier
    // ========================================================
    if (action === "checkout") {
      if (!accountId) throw new Error("accountId is required");
      // TODO: Replace with your actual Stripe Price ID for the platform subscription
      // Create this in your Stripe Dashboard under Products
      const subscriptionPriceId = priceId || Deno.env.get("FOREMAN_SUBSCRIPTION_PRICE_ID") || "price_PLACEHOLDER_SET_IN_ENV";

      if (subscriptionPriceId.includes("PLACEHOLDER")) {
        throw new Error(
          "FOREMAN_SUBSCRIPTION_PRICE_ID is not set. Create a subscription product in Stripe and set the price ID."
        );
      }

      const session = await stripeClient.checkout.sessions.create({
        // V2 pattern: customer_account uses the connected account ID directly
        // This links the subscription to the connected account
        customer_account: accountId,
        mode: "subscription",
        line_items: [
          { price: subscriptionPriceId, quantity: 1 },
        ],
        success_url: `${origin}/settings?tab=billing&subscription=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/settings?tab=billing&subscription=cancelled`,
      });

      return new Response(
        JSON.stringify({ url: session.url }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========================================================
    // ACTION: portal — Create a billing portal session for subscription management
    // Also uses customer_account (V2 pattern) for connected accounts
    // ========================================================
    if (action === "portal") {
      if (!accountId) throw new Error("accountId is required");

      const session = await stripeClient.billingPortal.sessions.create({
        // V2 pattern: customer_account instead of customer
        customer_account: accountId,
        return_url: `${origin}/settings?tab=billing`,
      });

      return new Response(
        JSON.stringify({ url: session.url }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Invalid action. Supported: checkout, portal");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed";
    console.error("Connect Subscription error:", error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
