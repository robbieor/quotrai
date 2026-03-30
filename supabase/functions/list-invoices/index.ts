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
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    // Get org membership
    const { data: orgMember } = await supabaseClient
      .from("org_members_v2")
      .select("org_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!orgMember?.org_id) throw new Error("User not in an organization");

    // Get Stripe customer ID from subscription
    const { data: subscription } = await supabaseClient
      .from("subscriptions_v2")
      .select("stripe_customer_id")
      .eq("org_id", orgMember.org_id)
      .maybeSingle();

    if (!subscription?.stripe_customer_id) {
      return new Response(
        JSON.stringify({ invoices: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2026-02-25.clover" as any });

    const invoices = await stripe.invoices.list({
      customer: subscription.stripe_customer_id,
      limit: 12,
    });

    const result = invoices.data.map((inv) => ({
      id: inv.id,
      date: inv.created ? new Date(inv.created * 1000).toISOString() : null,
      amount: (inv.amount_paid ?? inv.total ?? 0) / 100,
      currency: inv.currency?.toUpperCase() ?? "EUR",
      status: inv.status,
      hosted_url: inv.hosted_invoice_url,
      pdf_url: inv.invoice_pdf,
    }));

    return new Response(
      JSON.stringify({ invoices: result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to list invoices";
    console.error("Error listing invoices:", error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
