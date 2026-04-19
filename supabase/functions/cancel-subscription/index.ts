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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Invalid auth token");

    const userId = userData.user.id;

    // Get user's org
    const { data: orgId } = await supabase.rpc("get_user_org_id_v2");
    if (!orgId) {
      // Fallback: query org_members_v2 with service role
      const { data: member } = await supabase
        .from("org_members_v2")
        .select("org_id")
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();
      if (!member?.org_id) throw new Error("No organisation found");
      var resolvedOrgId = member.org_id;
    } else {
      var resolvedOrgId = orgId;
    }

    // Get subscription
    const { data: sub } = await supabase
      .from("subscriptions_v2")
      .select("stripe_subscription_id, status")
      .eq("org_id", resolvedOrgId)
      .maybeSingle();

    if (!sub?.stripe_subscription_id) {
      throw new Error("No active subscription found");
    }

    const { cancel } = await req.json();
    const shouldCancel = cancel === true;

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Stripe not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: shouldCancel,
    });

    // Update local DB
    await supabase
      .from("subscriptions_v2")
      .update({
        cancel_at_period_end: shouldCancel,
        updated_at: new Date().toISOString(),
      })
      .eq("org_id", resolvedOrgId);

    return new Response(
      JSON.stringify({ success: true, cancel_at_period_end: shouldCancel }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
