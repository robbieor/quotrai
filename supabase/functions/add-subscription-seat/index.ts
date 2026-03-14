import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("Stripe secret key not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Get user's team
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("team_id")
      .eq("id", user.id)
      .single();

    if (!profile?.team_id) {
      throw new Error("User not in a team");
    }

    // Verify user is an owner of the team
    const { data: membership, error: membershipError } = await supabaseClient
      .from("team_memberships")
      .select("role")
      .eq("user_id", user.id)
      .eq("team_id", profile.team_id)
      .single();

    if (membershipError || !membership || membership.role !== "owner") {
      return new Response(
        JSON.stringify({ error: "Only team owners can add subscription seats" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get subscription
    const { data: subscription } = await supabaseClient
      .from("subscriptions")
      .select("*")
      .eq("team_id", profile.team_id)
      .single();

    if (!subscription?.stripe_subscription_id) {
      throw new Error("No active subscription found. Please subscribe first.");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

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
      .from("subscriptions")
      .update({ 
        seat_count: newQuantity,
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscription.id);

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
