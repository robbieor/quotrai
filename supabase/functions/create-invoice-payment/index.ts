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

    const { portal_token } = await req.json();
    if (!portal_token) throw new Error("Missing portal_token");

    // Fetch invoice via portal token
    const { data: invoice, error: invoiceError } = await supabaseClient
      .rpc("get_invoice_by_portal_token", { token: portal_token });

    if (invoiceError || !invoice) {
      throw new Error("Invoice not found or invalid token");
    }

    if (invoice.status === "paid") {
      throw new Error("This invoice has already been paid");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get the team's Connect account and currency
    const { data: team } = await supabaseClient
      .from("teams")
      .select("stripe_connect_account_id, stripe_connect_onboarding_complete, platform_fee_percent")
      .eq("id", invoice.team_id)
      .single();

    if (!team?.stripe_connect_account_id || !team?.stripe_connect_onboarding_complete) {
      throw new Error("This business hasn't set up online payments yet. Please contact them directly.");
    }

    // Get currency from team profile
    const { data: teamProfile } = await supabaseClient
      .from("profiles")
      .select("currency")
      .eq("team_id", invoice.team_id)
      .limit(1)
      .single();

    const currency = (teamProfile?.currency || "EUR").toLowerCase();

    // Build line items
    const lineItems = invoice.items.map((item: { description: string; quantity: number; unit_price: number }) => ({
      price_data: {
        currency,
        product_data: { name: item.description },
        unit_amount: Math.round(item.unit_price * 100),
      },
      quantity: item.quantity,
    }));

    // Add tax line if applicable
    if (invoice.tax_amount && invoice.tax_amount > 0) {
      lineItems.push({
        price_data: {
          currency,
          product_data: { name: `Tax (${invoice.tax_rate}%)` },
          unit_amount: Math.round(invoice.tax_amount * 100),
        },
        quantity: 1,
      });
    }

    const totalInCents = Math.round((invoice.total || 0) * 100);
    const platformFeePercent = team.platform_fee_percent || 2.5;
    const applicationFee = Math.round(totalInCents * (platformFeePercent / 100));

    const origin = req.headers.get("origin") || "https://foreman.ie";
    const returnUrl = `${origin}/invoice/${portal_token}`;

    const session = await stripe.checkout.sessions.create({
      line_items: lineItems,
      mode: "payment",
      success_url: `${returnUrl}?payment=success`,
      cancel_url: `${returnUrl}?payment=cancelled`,
      payment_method_types: ["card"],
      payment_intent_data: {
        application_fee_amount: applicationFee,
        transfer_data: {
          destination: team.stripe_connect_account_id,
        },
        metadata: {
          invoice_id: invoice.id,
          portal_token,
          team_id: invoice.team_id,
        },
      },
      metadata: {
        invoice_id: invoice.id,
        portal_token,
        team_id: invoice.team_id,
        type: "invoice_payment",
      },
      customer_email: invoice.customer?.email || undefined,
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create payment session";
    console.error("Error creating invoice payment session:", error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
