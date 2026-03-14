import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Country code → Stripe-supported currency
const COUNTRY_CURRENCY: Record<string, string> = {
  ie: "eur", gb: "gbp", uk: "gbp",
  us: "usd", ca: "cad", au: "aud", nz: "nzd", ch: "chf",
  de: "eur", fr: "eur", es: "eur", it: "eur", nl: "eur",
  be: "eur", at: "eur", pt: "eur", fi: "eur", gr: "eur",
};
const DEFAULT_CURRENCY = "eur";

// Monthly prices in cents per currency (~€29 equivalent)
const MONTHLY_PRICE: Record<string, number> = {
  eur: 2900, gbp: 2500, usd: 3100,
  cad: 3900, aud: 4500, nzd: 4900, chf: 2800,
};

// Annual prices = monthly × 12 × 0.85 (15% discount)
const ANNUAL_PRICE: Record<string, number> = {
  eur: 29580, gbp: 25500, usd: 31620,
  cad: 39780, aud: 45900, nzd: 49980, chf: 28560,
};

const PLAN_NAME = "Quotr";
const PLAN_DESC = "Everything you need to run your trade business — voice included";

function getLookupKey(currency: string, interval: string): string {
  return `quotr_seat_${interval === "year" ? "annual" : "monthly"}_${currency}`;
}

async function getOrCreatePrice(stripe: Stripe, currency: string, interval: "month" | "year"): Promise<string> {
  const lookupKey = getLookupKey(currency, interval);

  const existingPrices = await stripe.prices.list({
    lookup_keys: [lookupKey],
    active: true,
    limit: 1,
  });

  if (existingPrices.data.length > 0) {
    return existingPrices.data[0].id;
  }

  const existingProducts = await stripe.products.list({ active: true, limit: 100 });
  let product = existingProducts.data.find((p: Stripe.Product) => p.name === PLAN_NAME);

  if (!product) {
    product = await stripe.products.create({
      name: PLAN_NAME,
      description: PLAN_DESC,
    });
  }

  const priceMap = interval === "year" ? ANNUAL_PRICE : MONTHLY_PRICE;
  const unitAmount = priceMap[currency] || priceMap[DEFAULT_CURRENCY];

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: unitAmount,
    currency,
    recurring: { interval },
    lookup_key: lookupKey,
  });

  return price.id;
}

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

    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("team_id, country, currency")
      .eq("id", user.id)
      .single();

    if (!profile?.team_id) throw new Error("User not in a team");

    const { data: membership } = await supabaseClient
      .from("team_memberships")
      .select("role")
      .eq("user_id", user.id)
      .eq("team_id", profile.team_id)
      .single();

    if (membership?.role !== "owner") throw new Error("Only team owners can manage billing");

    const { quantity = 1, isUpgrade = false, interval = "month" } = await req.json();
    const billingInterval: "month" | "year" = interval === "year" ? "year" : "month";

    const country = (profile.country || "").toLowerCase();
    const currency = COUNTRY_CURRENCY[country] || DEFAULT_CURRENCY;

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const priceId = await getOrCreatePrice(stripe, currency, billingInterval);

    let stripeCustomerId: string;
    const { data: subscription } = await supabaseClient
      .from("subscriptions")
      .select("stripe_customer_id, stripe_subscription_id")
      .eq("team_id", profile.team_id)
      .single();

    if (subscription?.stripe_customer_id) {
      stripeCustomerId = subscription.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { team_id: profile.team_id, user_id: user.id },
      });
      stripeCustomerId = customer.id;

      await supabaseClient
        .from("subscriptions")
        .upsert({
          team_id: profile.team_id,
          stripe_customer_id: stripeCustomerId,
          seat_count: quantity,
          status: "pending",
        }, { onConflict: "team_id" });
    }

    const origin = req.headers.get("origin") || "http://localhost:5173";

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

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity }],
      mode: "subscription",
      success_url: `${origin}/settings?tab=billing&success=true`,
      cancel_url: `${origin}/settings?tab=billing&cancelled=true`,
      subscription_data: {
        trial_period_days: isUpgrade ? 0 : 30,
        metadata: { team_id: profile.team_id },
      },
      automatic_tax: { enabled: true },
      customer_update: { address: "auto" },
      billing_address_collection: "required",
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
