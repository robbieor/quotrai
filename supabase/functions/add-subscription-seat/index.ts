import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Get auth user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    // Get user's org via RPC
    const { data: orgId } = await supabaseClient.rpc("get_user_org_id_v2");
    if (!orgId) throw new Error("User not in an organisation");

    // Verify user is an owner of their team
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("team_id")
      .eq("id", user.id)
      .single();

    if (profile?.team_id) {
      const { data: membership } = await supabaseClient
        .from("team_memberships")
        .select("role")
        .eq("user_id", user.id)
        .eq("team_id", profile.team_id)
        .single();

      if (!membership || !["owner", "ceo"].includes(membership.role)) {
        return new Response(
          JSON.stringify({ error: "Only team owners can add subscription seats" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Get subscription from subscriptions_v2
    const { data: subscription } = await supabaseClient
      .from("subscriptions_v2")
      .select("*")
      .eq("org_id", orgId)
      .single();

    if (!subscription?.stripe_subscription_id) {
      throw new Error("No active subscription found. Please subscribe first.");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2026-02-25.clover" as any });

    // Get current subscription from Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(
      subscription.stripe_subscription_id
    );

    // Update quantity (add one seat)
    const currentQuantity = stripeSubscription.items.data[0].quantity || 1;
    const newQuantity = currentQuantity + 1;

    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      items: [{
        id: stripeSubscription.items.data[0].id,
        quantity: newQuantity,
      }],
      proration_behavior: "create_prorations",
    });

    // Update local subscription record
    await supabaseClient
      .from("subscriptions_v2")
      .update({
        seat_count: newQuantity,
        updated_at: new Date().toISOString(),
      })
      .eq("org_id", orgId);

    return new Response(
      JSON.stringify({ success: true, new_seat_count: newQuantity }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error adding seat:", error);
    const message = error instanceof Error ? error.message : "An error occurred";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
