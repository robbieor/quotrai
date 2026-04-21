import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import {
  TIER_PRICES,
  detectTierFromItems,
  LEGACY_BASE_PRICES,
  LEGACY_SEAT_PRICES,
} from "../_shared/pricing.ts";

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

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get current subscription from Stripe
    const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);

    // Detect the active tier + interval from the existing line items so we
    // never silently downgrade a Business or Solo subscription to Crew.
    const detected = detectTierFromItems(stripeSub.items.data);
    if (!detected) {
      return new Response(
        JSON.stringify({
          error: "Could not detect subscription tier from Stripe line items. Please contact support.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { tier, interval } = detected;
    const tierConfig = TIER_PRICES[tier];
    const intervalKey = interval === "year" ? "year" : "month";
    const priceSet = tierConfig[intervalKey];
    const includedSeats = tierConfig.includedSeats;
    const desiredExtraSeats = Math.max(0, totalMembers - includedSeats);

    // Build a current-items map keyed by price id
    const currentItems: Record<string, { id: string; quantity: number }> = {};
    for (const item of stripeSub.items.data) {
      currentItems[item.price.id] = { id: item.id, quantity: item.quantity || 0 };
    }

    const items: Stripe.SubscriptionUpdateParams.Item[] = [];

    // Ensure base plan exists with quantity 1
    if (currentItems[priceSet.base]) {
      if (currentItems[priceSet.base].quantity !== 1) {
        items.push({ id: currentItems[priceSet.base].id, quantity: 1 });
      }
    } else {
      items.push({ price: priceSet.base, quantity: 1 });
    }

    // Sync extra seats (only if this tier supports them)
    if (priceSet.seat) {
      if (desiredExtraSeats > 0) {
        if (currentItems[priceSet.seat]) {
          if (currentItems[priceSet.seat].quantity !== desiredExtraSeats) {
            items.push({ id: currentItems[priceSet.seat].id, quantity: desiredExtraSeats });
          }
        } else {
          items.push({ price: priceSet.seat, quantity: desiredExtraSeats });
        }
      } else if (currentItems[priceSet.seat]) {
        // Remove seat line item if no longer needed
        items.push({ id: currentItems[priceSet.seat].id, deleted: true });
      }
    }

    // Clean up ONLY recognised legacy items (never delete unknown items —
    // they may be add-ons we don't know about and deleting them silently
    // changes what the customer is paying for).
    for (const [priceId, item] of Object.entries(currentItems)) {
      if (priceId === priceSet.base) continue;
      if (priceId === priceSet.seat) continue;
      if (LEGACY_BASE_PRICES.has(priceId) || LEGACY_SEAT_PRICES.has(priceId)) {
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
        tier,
        interval,
        total_members: totalMembers,
        included_seats: includedSeats,
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
