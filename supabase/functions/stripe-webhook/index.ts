import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!stripeKey || !webhookSecret) {
      throw new Error("Missing Stripe configuration");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    if (!signature) throw new Error("Missing stripe-signature header");

    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    logStep("Event received", { type: event.type, id: event.id });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    switch (event.type) {
      // ── Subscription lifecycle (v2 tables) ──
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        logStep("Subscription update", {
          id: subscription.id,
          status: subscription.status,
          customer: customerId,
        });

        // Try to find org by stripe_customer_id in subscriptions_v2
        const { data: subV2 } = await supabase
          .from("subscriptions_v2")
          .select("org_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        // Also try subscription metadata for org_id (set during checkout)
        const metadataOrgId = subscription.metadata?.org_id;
        const orgId = subV2?.org_id || metadataOrgId;

        if (orgId) {
          const totalSeats = subscription.items.data.reduce(
            (sum, item) => sum + (item.quantity || 0), 0
          );

          await supabase
            .from("subscriptions_v2")
            .upsert({
              org_id: orgId,
              status: subscription.status,
              stripe_subscription_id: subscription.id,
              stripe_customer_id: customerId,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              seat_count: totalSeats,
              updated_at: new Date().toISOString(),
            }, { onConflict: "org_id" });
          logStep("subscriptions_v2 updated", { orgId, status: subscription.status, seats: totalSeats });
        } else {
          logStep("WARNING: Could not resolve org_id for customer", { customerId });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription cancelled", { id: subscription.id });

        const { data: subV2 } = await supabase
          .from("subscriptions_v2")
          .select("org_id")
          .eq("stripe_subscription_id", subscription.id)
          .maybeSingle();

        if (subV2?.org_id) {
          await supabase
            .from("subscriptions_v2")
            .update({ status: "canceled", updated_at: new Date().toISOString() })
            .eq("org_id", subV2.org_id);
          logStep("subscriptions_v2 set to canceled", { orgId: subV2.org_id });
        }
        break;
      }

      // ── Checkout completed ──
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout completed", { id: session.id, mode: session.mode });

        // Handle customer-facing invoice payments
        if (session.metadata?.type === "invoice_payment") {
          const invoiceId = session.metadata.invoice_id;
          const amount = (session.amount_total || 0) / 100;

          if (invoiceId) {
            await supabase
              .from("invoices")
              .update({ status: "paid", updated_at: new Date().toISOString() })
              .eq("id", invoiceId);

            const { data: invoice } = await supabase
              .from("invoices")
              .select("team_id")
              .eq("id", invoiceId)
              .single();

            if (invoice) {
              await supabase.from("payments").insert({
                invoice_id: invoiceId,
                team_id: invoice.team_id,
                amount,
                payment_method: "card",
                notes: `Stripe checkout ${session.id}`,
              });
            }
            logStep("Invoice payment recorded", { invoiceId, amount });
          }
        }

        // Handle subscription checkout — activate v2 record
        if (session.mode === "subscription" && session.subscription) {
          const customerId = session.customer as string;
          const stripeSubId = session.subscription as string;

          // Retrieve subscription for metadata and period info
          const stripeSub = await stripe.subscriptions.retrieve(stripeSubId);
          const orgId = stripeSub.metadata?.org_id || session.metadata?.org_id;

          if (orgId) {
            const totalSeats = stripeSub.items.data.reduce(
              (sum, item) => sum + (item.quantity || 0), 0
            );

            await supabase
              .from("subscriptions_v2")
              .upsert({
                org_id: orgId,
                status: stripeSub.status,
                stripe_subscription_id: stripeSubId,
                stripe_customer_id: customerId,
                current_period_start: new Date(stripeSub.current_period_start * 1000).toISOString(),
                current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
                seat_count: totalSeats,
                updated_at: new Date().toISOString(),
              }, { onConflict: "org_id" });
            logStep("subscriptions_v2 activated via checkout", { orgId, status: stripeSub.status });
          } else {
            logStep("WARNING: No org_id in subscription metadata for checkout", { stripeSubId });
          }
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
