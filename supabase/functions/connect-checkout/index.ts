import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.6.0";

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
    const stripeClient = new Stripe(stripeKey);

    const { accountId, productName, unitAmount, currency, quantity } = await req.json();

    if (!accountId) throw new Error("accountId is required");
    if (!productName) throw new Error("productName is required");
    if (!unitAmount || unitAmount < 1) throw new Error("unitAmount must be at least 1 cent");

    // Calculate a 2.9% application fee — this is Foreman's platform fee
    // The fee is deducted from the payment before funds reach the connected account
    const applicationFeeAmount = Math.round(unitAmount * (quantity || 1) * 0.029);

    const origin = req.headers.get("origin") || "https://foreman.world";

    // Create a Checkout Session using Direct Charges
    // The stripeAccount option routes the charge directly to the connected account
    // application_fee_amount is how the platform (Foreman) earns revenue
    const session = await stripeClient.checkout.sessions.create(
      {
        line_items: [
          {
            price_data: {
              currency: currency || "eur",
              product_data: {
                name: productName,
              },
              unit_amount: unitAmount,
            },
            quantity: quantity || 1,
          },
        ],
        payment_intent_data: {
          // Application fee goes to the platform (Foreman)
          application_fee_amount: applicationFeeAmount,
        },
        mode: "payment",
        success_url: `${origin}/storefront/${accountId}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/storefront/${accountId}?checkout=cancelled`,
      },
      {
        // Direct Charge: the connected account is the merchant of record
        stripeAccount: accountId,
      }
    );

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed";
    console.error("Connect Checkout error:", error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
