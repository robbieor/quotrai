import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Stripe Price IDs — must match create-checkout-session
const STRIPE_PRICES: Record<string, Record<string, string>> = {
  lite: {
    month: "price_1T7b44DQETj2awNEVZC5FQn2",
    year: "price_1T7b4eDQETj2awNEhlMGRoGE",
  },
  connect: {
    month: "price_1T7afYDQETj2awNEcXocEe7h",
    year: "price_1T7apqDQETj2awNEXdefYkfs",
  },
  grow: {
    month: "price_1T7agsDQETj2awNEeLQafzg5",
    year: "price_1T7ahZDQETj2awNE5gr1v6DI",
  },
};

// Reverse lookup: price_id → seat_type
const PRICE_TO_SEAT: Record<string, string> = {};
for (const [seatType, intervals] of Object.entries(STRIPE_PRICES)) {
  for (const priceId of Object.values(intervals)) {
    PRICE_TO_SEAT[priceId] = seatType;
  }
}

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

    // Count seats by type
    const { data: members } = await supabaseClient
      .from("org_members_v2")
      .select("seat_type")
      .eq("org_id", orgId)
      .eq("status", "active");

    const desiredCounts: Record<string, number> = {};
    (members || []).forEach((m: { seat_type: string }) => {
      desiredCounts[m.seat_type] = (desiredCounts[m.seat_type] || 0) + 1;
    });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Get current subscription from Stripe
    const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
    const billingInterval = stripeSub.items.data[0]?.plan?.interval || "month";

    // Build desired items map: priceId → quantity
    const desiredItems: Record<string, number> = {};
    for (const [seatType, count] of Object.entries(desiredCounts)) {
      const priceId = STRIPE_PRICES[seatType]?.[billingInterval];
      if (priceId) desiredItems[priceId] = count;
    }

    // Build current items map from Stripe
    const currentItems: Record<string, { id: string; quantity: number }> = {};
    for (const item of stripeSub.items.data) {
      currentItems[item.price.id] = { id: item.id, quantity: item.quantity || 0 };
    }

    // Calculate updates
    const items: Stripe.SubscriptionUpdateParams.Item[] = [];

    // Update existing or add new
    for (const [priceId, quantity] of Object.entries(desiredItems)) {
      if (currentItems[priceId]) {
        if (currentItems[priceId].quantity !== quantity) {
          items.push({ id: currentItems[priceId].id, quantity });
        }
      } else {
        items.push({ price: priceId, quantity });
      }
    }

    // Remove items no longer needed
    for (const [priceId, item] of Object.entries(currentItems)) {
      if (!desiredItems[priceId]) {
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
    const totalSeats = Object.values(desiredCounts).reduce((a, b) => a + b, 0);
    await supabaseClient
      .from("subscriptions_v2")
      .update({ 
        seat_count: totalSeats,
        updated_at: new Date().toISOString(),
      })
      .eq("org_id", orgId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        seats: desiredCounts, 
        total: totalSeats,
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
