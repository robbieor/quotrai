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

/** Resolve org_id from subscription metadata, customer metadata, or DB lookup */
async function resolveOrgId(
  stripe: Stripe,
  supabase: any,
  subscription: Stripe.Subscription
): Promise<string | null> {
  // 1. Subscription metadata (set during checkout via subscription_data.metadata)
  if (subscription.metadata?.org_id) return subscription.metadata.org_id;

  const customerId = subscription.customer as string;

  // 2. DB lookup by stripe_customer_id
  const { data: subV2 } = await supabase
    .from("subscriptions_v2")
    .select("org_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (subV2?.org_id) return subV2.org_id;

  // 3. Stripe customer metadata
  const customer = await stripe.customers.retrieve(customerId);
  if (!customer.deleted && (customer as Stripe.Customer).metadata?.org_id) {
    return (customer as Stripe.Customer).metadata.org_id;
  }

  return null;
}

/** Map Stripe price IDs back to seat types */
const PRICE_TO_SEAT: Record<string, string> = {
  price_1TEa4dDQETj2awNErpoa1vHM: "lite",
  price_1TEa57DQETj2awNEESev15XR: "lite",
  price_1TEa5SDQETj2awNE4qhL4fa7: "connect",
  price_1TEa5tDQETj2awNE2zfrsMkY: "connect",
  price_1TEa6HDQETj2awNEycXwPCfc: "grow",
  price_1TEa6oDQETj2awNEHSl42OYl: "grow",
};

function derivePlanTier(subscription: Stripe.Subscription): string {
  // Use highest-tier seat in the subscription
  const tiers = ["grow", "connect", "lite"];
  for (const item of subscription.items.data) {
    const seat = PRICE_TO_SEAT[item.price.id];
    if (seat) {
      const idx = tiers.indexOf(seat);
      if (idx === 0) return "grow";
    }
  }
  // Check for connect
  for (const item of subscription.items.data) {
    if (PRICE_TO_SEAT[item.price.id] === "connect") return "connect";
  }
  return "lite";
}

async function upsertSubscription(
  supabase: any,
  orgId: string,
  subscription: Stripe.Subscription,
  customerId: string
) {
  const totalSeats = subscription.items.data.reduce(
    (sum, item) => sum + (item.quantity || 0),
    0
  );

  const trialEnd = subscription.trial_end
    ? new Date(subscription.trial_end * 1000).toISOString()
    : null;

  const planTier = derivePlanTier(subscription);

  await supabase.from("subscriptions_v2").upsert(
    {
      org_id: orgId,
      status: subscription.status,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: customerId,
      current_period_start: new Date(
        subscription.current_period_start * 1000
      ).toISOString(),
      current_period_end: new Date(
        subscription.current_period_end * 1000
      ).toISOString(),
      seat_count: totalSeats,
      trial_ends_at: trialEnd,
      plan_tier: planTier,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "org_id" }
  );

  logStep("subscriptions_v2 upserted", {
    orgId,
    status: subscription.status,
    seats: totalSeats,
    planTier,
  });
}

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

    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret
    );
    logStep("Event received", { type: event.type, id: event.id });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    switch (event.type) {
      // ── Subscription lifecycle ──
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        logStep("Subscription update", {
          id: subscription.id,
          status: subscription.status,
          customer: customerId,
        });

        const orgId = await resolveOrgId(stripe, supabase, subscription);
        if (orgId) {
          await upsertSubscription(supabase, orgId, subscription, customerId);
        } else {
          logStep("WARNING: Could not resolve org_id", { customerId });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        logStep("Subscription cancelled", { id: subscription.id });

        const orgId = await resolveOrgId(stripe, supabase, subscription);
        if (orgId) {
          await supabase
            .from("subscriptions_v2")
            .update({
              status: "canceled",
              updated_at: new Date().toISOString(),
            })
            .eq("org_id", orgId);
          logStep("subscriptions_v2 set to canceled", { orgId });
        }
        break;
      }

      // ── Invoice events (trial→active transitions, payment failures) ──
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription?.id;

        if (subId && invoice.billing_reason === "subscription_cycle") {
          // Renewal succeeded — ensure status is active
          const { data: subV2 } = await supabase
            .from("subscriptions_v2")
            .select("org_id")
            .eq("stripe_subscription_id", subId)
            .maybeSingle();

          if (subV2?.org_id) {
            await supabase
              .from("subscriptions_v2")
              .update({
                status: "active",
                updated_at: new Date().toISOString(),
              })
              .eq("org_id", subV2.org_id);
            logStep("Renewal payment succeeded, marked active", {
              orgId: subV2.org_id,
            });
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription?.id;

        if (subId) {
          const { data: subV2 } = await supabase
            .from("subscriptions_v2")
            .select("org_id")
            .eq("stripe_subscription_id", subId)
            .maybeSingle();

          if (subV2?.org_id) {
            await supabase
              .from("subscriptions_v2")
              .update({
                status: "past_due",
                updated_at: new Date().toISOString(),
              })
              .eq("org_id", subV2.org_id);
            logStep("Payment failed, marked past_due", {
              orgId: subV2.org_id,
            });
          }
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
              .update({
                status: "paid",
                updated_at: new Date().toISOString(),
              })
              .eq("id", invoiceId);

            const { data: inv } = await supabase
              .from("invoices")
              .select("team_id")
              .eq("id", invoiceId)
              .single();

            if (inv) {
              await supabase.from("payments").insert({
                invoice_id: invoiceId,
                team_id: inv.team_id,
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
          const stripeSubId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription;

          const stripeSub = await stripe.subscriptions.retrieve(
            stripeSubId as string
          );
          // org_id is in subscription_data.metadata (set by create-checkout-session)
          const orgId =
            stripeSub.metadata?.org_id || session.metadata?.org_id;

          if (orgId) {
            await upsertSubscription(
              supabase,
              orgId,
              stripeSub,
              customerId
            );
            logStep("Subscription activated via checkout", { orgId });
          } else {
            // Fallback: look up by customer metadata
            const customer = await stripe.customers.retrieve(customerId);
            const fallbackOrgId =
              !customer.deleted &&
              (customer as Stripe.Customer).metadata?.org_id;
            if (fallbackOrgId) {
              await upsertSubscription(
                supabase,
                fallbackOrgId,
                stripeSub,
                customerId
              );
              logStep("Subscription activated via customer metadata", {
                orgId: fallbackOrgId,
              });
            } else {
              logStep("WARNING: No org_id found for checkout", {
                stripeSubId,
                customerId,
              });
            }
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
