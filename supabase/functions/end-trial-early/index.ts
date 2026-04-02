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

  const log = (s: string, d?: any) => console.log(`[END-TRIAL] ${s}`, d || "");

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Stripe not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    // Get org subscription
    const { data: orgMember } = await supabaseClient
      .from("org_members_v2")
      .select("org_id, role")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!orgMember?.org_id) throw new Error("User not in an organization");

    // Only owners/admins can end trial
    if (orgMember.role !== "owner" && orgMember.role !== "admin") {
      throw new Error("Only account owners can end the trial early");
    }

    const { data: subscription } = await supabaseClient
      .from("subscriptions_v2")
      .select("stripe_subscription_id, status, trial_ends_at")
      .eq("org_id", orgMember.org_id)
      .single();

    if (!subscription?.stripe_subscription_id) {
      throw new Error("No active subscription found");
    }

    if (subscription.status !== "trialing") {
      throw new Error("Subscription is not in a trial period");
    }

    log("Ending trial early", {
      subscriptionId: subscription.stripe_subscription_id,
      trialEndsAt: subscription.trial_ends_at,
    });

    const stripe = new Stripe(stripeKey, { apiVersion: "2026-02-25.clover" as any });

    // End trial immediately — Stripe will charge the customer right away
    const updated = await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      trial_end: "now",
    });

    log("Trial ended", {
      status: updated.status,
      currentPeriodEnd: updated.current_period_end,
    });

    // Update local subscription record
    await supabaseClient
      .from("subscriptions_v2")
      .update({
        status: updated.status,
        trial_ends_at: new Date().toISOString(),
        current_period_start: new Date(updated.current_period_start * 1000).toISOString(),
        current_period_end: new Date(updated.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("org_id", orgMember.org_id);

    return new Response(
      JSON.stringify({
        success: true,
        status: updated.status,
        current_period_end: new Date(updated.current_period_end * 1000).toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to end trial";
    log("ERROR", { message });
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
