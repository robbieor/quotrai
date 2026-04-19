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
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not configured.");
    const stripeClient = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { action, accountId, name, description, priceInCents, currency } = await req.json();

    // ========================================================
    // ACTION: create — Create a product on the connected account
    // Uses the stripeAccount header to scope the product to the connected account
    // ========================================================
    if (action === "create") {
      // Authenticate the calling user
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) throw new Error("No authorization header");
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
      if (userError || !user) throw new Error("Unauthorized");

      // Validate inputs
      if (!accountId) throw new Error("accountId is required");
      if (!name) throw new Error("Product name is required");
      if (!priceInCents || priceInCents < 1) throw new Error("Price must be at least 1 cent");

      // Create the product with a default price on the connected account
      // The stripeAccount option sets the Stripe-Account header
      const product = await stripeClient.products.create(
        {
          name,
          description: description || undefined,
          default_price_data: {
            unit_amount: priceInCents,
            currency: currency || "eur",
          },
        },
        {
          stripeAccount: accountId,
        }
      );

      return new Response(
        JSON.stringify({ product }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========================================================
    // ACTION: list — List active products on the connected account
    // Expands default_price so we get pricing info in one call
    // ========================================================
    if (action === "list") {
      if (!accountId) throw new Error("accountId is required");

      const products = await stripeClient.products.list(
        {
          limit: 20,
          active: true,
          expand: ["data.default_price"],
        },
        {
          stripeAccount: accountId,
        }
      );

      return new Response(
        JSON.stringify({ products: products.data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Invalid action. Supported: create, list");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed";
    console.error("Connect Products error:", error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
