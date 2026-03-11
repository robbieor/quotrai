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
      // Subscription lifecycle
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription update", {
          id: subscription.id,
          status: subscription.status,
          customer: subscription.customer,
        });

        // Find team by stripe_customer_id
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("team_id")
          .eq("stripe_customer_id", subscription.customer as string)
          .single();

        if (sub) {
          await supabase
            .from("subscriptions")
            .update({
              status: subscription.status,
              stripe_subscription_id: subscription.id,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("team_id", sub.team_id);
          logStep("Subscription updated in DB", { teamId: sub.team_id });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription cancelled", { id: subscription.id });

        const { data: sub } = await supabase
          .from("subscriptions")
          .select("team_id")
          .eq("stripe_subscription_id", subscription.id)
          .single();

        if (sub) {
          await supabase
            .from("subscriptions")
            .update({ status: "canceled", updated_at: new Date().toISOString() })
            .eq("team_id", sub.team_id);

          await supabase.from("subscription_history").insert({
            team_id: sub.team_id,
            event_type: "subscription_cancelled",
            stripe_event_id: event.id,
          });
        }
        break;
      }

      // Invoice payment (customer-facing invoices via Checkout)
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout completed", { id: session.id, mode: session.mode });

        if (session.metadata?.type === "invoice_payment") {
          const invoiceId = session.metadata.invoice_id;
          const amount = (session.amount_total || 0) / 100;

          if (invoiceId) {
            await supabase
              .from("invoices")
              .update({
                status: "paid",
                updated_at: new Date().toISOString(),
              })
              .eq("id", invoiceId);

            // Record payment
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
