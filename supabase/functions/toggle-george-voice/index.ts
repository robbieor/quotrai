import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Pricing constant - must match frontend
const TOM_VOICE_PRICE = 20;
const VOICE_MINUTES_PER_SEAT = 60;

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

    const { targetUserId, enable } = await req.json();

    if (!targetUserId || typeof enable !== "boolean") {
      throw new Error("Missing required parameters: targetUserId and enable");
    }

    // Get caller's profile and team
    const { data: callerProfile } = await supabaseClient
      .from("profiles")
      .select("team_id")
      .eq("id", user.id)
      .single();

    if (!callerProfile?.team_id) {
      throw new Error("User not in a team");
    }

    // Verify caller is an owner
    const { data: membership } = await supabaseClient
      .from("team_memberships")
      .select("role")
      .eq("user_id", user.id)
      .eq("team_id", callerProfile.team_id)
      .single();

    if (!membership || membership.role !== "owner") {
      return new Response(
        JSON.stringify({ error: "Only team owners can manage Tom Voice access" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify target user is in the same team
    const { data: targetProfile } = await supabaseClient
      .from("profiles")
      .select("team_id, has_george_voice")
      .eq("id", targetUserId)
      .single();

    if (!targetProfile || targetProfile.team_id !== callerProfile.team_id) {
      throw new Error("Target user not found in your team");
    }

    // Check if already in desired state
    if (targetProfile.has_george_voice === enable) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: enable ? "User already has Tom Voice" : "User already doesn't have Tom Voice" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get team data
    const { data: team } = await supabaseClient
      .from("teams")
      .select("george_voice_seats")
      .eq("id", callerProfile.team_id)
      .single();

    // Get subscription
    const { data: subscription } = await supabaseClient
      .from("subscriptions")
      .select("stripe_subscription_id, stripe_george_item_id, stripe_customer_id")
      .eq("team_id", callerProfile.team_id)
      .single();

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const currentVoiceSeats = team?.george_voice_seats || 0;
    const newVoiceSeats = enable ? currentVoiceSeats + 1 : Math.max(0, currentVoiceSeats - 1);

    // Update Stripe subscription if exists
    if (subscription?.stripe_subscription_id) {
      const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
      
      // Find the Tom Voice line item by metadata or stored ID
      let voiceItem = subscription.stripe_george_item_id 
        ? stripeSubscription.items.data.find((item: Stripe.SubscriptionItem) => item.id === subscription.stripe_george_item_id)
        : stripeSubscription.items.data.find((item: Stripe.SubscriptionItem) => item.price?.metadata?.type === "tom_voice");

      if (newVoiceSeats > 0) {
        if (voiceItem) {
          // Update existing Tom Voice quantity
          await stripe.subscriptionItems.update(voiceItem.id, {
            quantity: newVoiceSeats,
            proration_behavior: "create_prorations",
          });
          console.log(`Updated Tom Voice subscription item to ${newVoiceSeats} seats`);
        } else {
          // Add Tom Voice line item to subscription
          // Look up price by ID or use environment variable
          const voicePriceId = Deno.env.get("STRIPE_TOM_VOICE_PRICE_ID");
          
          if (!voicePriceId) {
            console.warn("STRIPE_TOM_VOICE_PRICE_ID not set, attempting to find price in Stripe");
            // Try to find by metadata
            const prices = await stripe.prices.list({ 
              active: true, 
              limit: 100,
              expand: ['data.product']
            });
            const voicePrice = prices.data.find((p: Stripe.Price) => 
              p.metadata?.type === "tom_voice" || 
              ((p.product as Stripe.Product)?.name?.toLowerCase().includes("tom voice"))
            );
            
            if (!voicePrice) {
              throw new Error("Tom Voice price not found in Stripe. Please configure STRIPE_TOM_VOICE_PRICE_ID.");
            }
            
            const newItem = await stripe.subscriptionItems.create({
              subscription: subscription.stripe_subscription_id,
              price: voicePrice.id,
              quantity: newVoiceSeats,
              proration_behavior: "create_prorations",
            });

            // Save the item ID
            await supabaseClient
              .from("subscriptions")
              .update({ stripe_george_item_id: newItem.id })
              .eq("team_id", callerProfile.team_id);
              
            console.log(`Added Tom Voice subscription item with ${newVoiceSeats} seats`);
          } else {
            const newItem = await stripe.subscriptionItems.create({
              subscription: subscription.stripe_subscription_id,
              price: voicePriceId,
              quantity: newVoiceSeats,
              proration_behavior: "create_prorations",
            });

            // Save the item ID
            await supabaseClient
              .from("subscriptions")
              .update({ stripe_george_item_id: newItem.id })
              .eq("team_id", callerProfile.team_id);
              
            console.log(`Added Tom Voice subscription item with ${newVoiceSeats} seats`);
          }
        }
      } else if (voiceItem) {
        // Remove Tom Voice line item if no more seats
        await stripe.subscriptionItems.del(voiceItem.id, {
          proration_behavior: "create_prorations",
        });
        
        await supabaseClient
          .from("subscriptions")
          .update({ stripe_george_item_id: null })
          .eq("team_id", callerProfile.team_id);
          
        console.log("Removed Tom Voice subscription item");
      }
    }

    // Update the user's profile
    await supabaseClient
      .from("profiles")
      .update({
        has_george_voice: enable,
        george_voice_added_at: enable ? new Date().toISOString() : null,
      })
      .eq("id", targetUserId);

    // Update team's voice seat count and minutes limit
    await supabaseClient
      .from("teams")
      .update({
        george_voice_seats: newVoiceSeats,
        george_voice_minutes_limit: newVoiceSeats * VOICE_MINUTES_PER_SEAT,
      })
      .eq("id", callerProfile.team_id);

    // Log the change
    await supabaseClient
      .from("subscription_history")
      .insert({
        team_id: callerProfile.team_id,
        event_type: enable ? "tom_voice_added" : "tom_voice_removed",
        amount: enable ? TOM_VOICE_PRICE : -TOM_VOICE_PRICE,
      });

    console.log(`Tom Voice ${enable ? "enabled" : "disabled"} for user ${targetUserId}, team now has ${newVoiceSeats} voice seats`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        tom_voice_seats: newVoiceSeats,
        monthly_cost_change: enable ? TOM_VOICE_PRICE : -TOM_VOICE_PRICE,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error toggling Tom Voice:", error);
    const message = error instanceof Error ? error.message : "An error occurred";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
