import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// New single-plan pricing
const BASE_PLAN_PRICE = "price_1TIJDeDQETj2awNEWxP4bB43"; // €39/mo
const EXTRA_SEAT_PRICE = "price_1TKjaNDQETj2awNEXHD4jFRq"; // €15/mo
const BASE_USERS = 1;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    // Get org
    const { data: orgMember } = await supabaseClient
      .from("org_members_v2")
      .select("org_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!orgMember?.org_id) throw new Error("User not in an organization");
    const orgId = orgMember.org_id;

    // Get subscription
    const { data: sub } = await supabaseClient
      .from("subscriptions_v2")
      .select("*")
      .eq("org_id", orgId)
      .single();

    if (!sub?.stripe_subscription_id || !sub?.stripe_customer_id) {
      return new Response(
        JSON.stringify({ message: "No active Stripe subscription to sync" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Count total active members
    const { data: members, count } = await supabaseClient
      .from("org_members_v2")
      .select("id", { count: "exact" })
      .eq("org_id", orgId)
      .eq("status", "active");

    const totalMembers = count || (members?.length ?? 0);
    const desiredExtraSeats = Math.max(0, totalMembers - BASE_USERS);

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get current subscription from Stripe
    const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);

    // Find current items by price
    const currentItems: Record<string, { id: string; quantity: number }> = {};
    for (const item of stripeSub.items.data) {
      currentItems[item.price.id] = { id: item.id, quantity: item.quantity || 0 };
    }

    // Calculate updates
    const items: Stripe.SubscriptionUpdateParams.Item[] = [];

    // Ensure base plan exists with quantity 1
    if (currentItems[BASE_PLAN_PRICE]) {
      if (currentItems[BASE_PLAN_PRICE].quantity !== 1) {
        items.push({ id: currentItems[BASE_PLAN_PRICE].id, quantity: 1 });
      }
    } else {
      items.push({ price: BASE_PLAN_PRICE, quantity: 1 });
    }

    // Sync extra seats
    if (desiredExtraSeats > 0) {
      if (currentItems[EXTRA_SEAT_PRICE]) {
        if (currentItems[EXTRA_SEAT_PRICE].quantity !== desiredExtraSeats) {
          items.push({ id: currentItems[EXTRA_SEAT_PRICE].id, quantity: desiredExtraSeats });
        }
      } else {
        items.push({ price: EXTRA_SEAT_PRICE, quantity: desiredExtraSeats });
      }
    } else if (currentItems[EXTRA_SEAT_PRICE]) {
      // Remove extra seat line item if no longer needed
      items.push({ id: currentItems[EXTRA_SEAT_PRICE].id, deleted: true });
    }

    // Remove any legacy tier items that aren't the new prices
    for (const [priceId, item] of Object.entries(currentItems)) {
      if (priceId !== BASE_PLAN_PRICE && priceId !== EXTRA_SEAT_PRICE) {
        items.push({ id: item.id, deleted: true });
      }
    }

    // Only update if there are changes
    if (items.length > 0) {
      await stripe.subscriptions.update(sub.stripe_subscription_id, {
        items,
        proration_behavior: "none",
      });
    }

    // Update local subscription record
    await supabaseClient
      .from("subscriptions_v2")
      .update({
        seat_count: totalMembers,
        updated_at: new Date().toISOString(),
      })
      .eq("org_id", orgId);

    return new Response(
      JSON.stringify({
        success: true,
        total_members: totalMembers,
        extra_seats: desiredExtraSeats,
        changes: items.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Sync failed";
    console.error("Error syncing seats to Stripe:", error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
