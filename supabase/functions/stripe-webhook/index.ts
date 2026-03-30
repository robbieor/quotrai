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

function brandedEmailHtml(title: string, bodyLines: string[]): string {
  const bodyHtml = bodyLines.map(l => `<p style="margin:0 0 12px;color:#333;font-size:14px;line-height:1.6">${l}</p>`).join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body style="margin:0;padding:0;background:#f4f4f5;font-family:'Manrope',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="100%" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden">
<tr><td style="background:#0f1b2d;padding:24px 32px;text-align:center">
<img src="https://quotrai.lovable.app/foreman-logo.png" alt="Foreman" width="40" height="40" style="border-radius:8px"/>
<span style="color:#fff;font-size:20px;font-weight:700;margin-left:12px;vertical-align:middle">Foreman</span>
</td></tr>
<tr><td style="padding:32px">
<h1 style="margin:0 0 16px;font-size:20px;color:#0f1b2d">${title}</h1>
${bodyHtml}
</td></tr>
<tr><td style="padding:16px 32px;background:#f9fafb;text-align:center;font-size:12px;color:#999">
© ${new Date().getFullYear()} Foreman · support@foreman.ie
</td></tr></table></td></tr></table></body></html>`;
}

async function sendBrandedEmail(supabase: any, to: string, subject: string, html: string, idempotencyKey: string) {
  try {
    await supabase.rpc("enqueue_email", {
      p_queue_name: "transactional_emails",
      p_message: JSON.stringify({
        to,
        subject,
        html,
        from: "Foreman <support@foreman.ie>",
        idempotency_key: idempotencyKey,
        purpose: "transactional",
      }),
    });
    logStep("Email enqueued", { to, subject });
  } catch (e) {
    logStep("Email enqueue failed (non-fatal)", { to, error: String(e) });
  }
}

async function resolveOrgId(
  stripe: Stripe,
  supabase: any,
  subscription: Stripe.Subscription
): Promise<string | null> {
  if (subscription.metadata?.org_id) return subscription.metadata.org_id;

  const customerId = subscription.customer as string;

  const { data: subV2 } = await supabase
    .from("subscriptions_v2")
    .select("org_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (subV2?.org_id) return subV2.org_id;

  const customer = await stripe.customers.retrieve(customerId);
  if (!customer.deleted && (customer as Stripe.Customer).metadata?.org_id) {
    return (customer as Stripe.Customer).metadata.org_id;
  }

  return null;
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

  await supabase.from("subscriptions_v2").upsert(
    {
      org_id: orgId,
      status: subscription.status,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: customerId,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      seat_count: totalSeats,
      trial_ends_at: trialEnd,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "org_id" }
  );

  logStep("subscriptions_v2 upserted", { orgId, status: subscription.status, seats: totalSeats });
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

    const stripe = new Stripe(stripeKey, { apiVersion: "2026-02-25.clover" as any });
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
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        logStep("Subscription update", { id: subscription.id, status: subscription.status, customer: customerId });

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
            .update({ status: "canceled", updated_at: new Date().toISOString() })
            .eq("org_id", orgId);
          logStep("subscriptions_v2 set to canceled", { orgId });

          // Send cancellation email to customer
          const customer = await stripe.customers.retrieve(customerId);
          if (!customer.deleted && (customer as Stripe.Customer).email) {
            const email = (customer as Stripe.Customer).email!;
            await sendBrandedEmail(
              supabase,
              email,
              "Your Foreman subscription has been cancelled",
              brandedEmailHtml("Subscription Cancelled", [
                "Your Foreman subscription has been cancelled.",
                "Your access will continue until the end of your current billing period.",
                "If this was a mistake or you'd like to resubscribe, you can do so anytime from your Settings page.",
                "Thanks for being part of Foreman. We'd love to have you back."
              ]),
              `sub-cancelled-${subscription.id}`
            );
          }
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = typeof invoice.subscription === "string"
          ? invoice.subscription
          : invoice.subscription?.id;

        if (subId && invoice.billing_reason === "subscription_cycle") {
          const { data: subV2 } = await supabase
            .from("subscriptions_v2")
            .select("org_id")
            .eq("stripe_subscription_id", subId)
            .maybeSingle();

          if (subV2?.org_id) {
            await supabase
              .from("subscriptions_v2")
              .update({ status: "active", updated_at: new Date().toISOString() })
              .eq("org_id", subV2.org_id);
            logStep("Renewal succeeded, marked active", { orgId: subV2.org_id });
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = typeof invoice.subscription === "string"
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
              .update({ status: "past_due", updated_at: new Date().toISOString() })
              .eq("org_id", subV2.org_id);
            logStep("Payment failed, marked past_due", { orgId: subV2.org_id });

            // Send payment failure email to customer
            const customerId = typeof invoice.customer === "string"
              ? invoice.customer
              : invoice.customer?.id;
            if (customerId) {
              const customer = await stripe.customers.retrieve(customerId);
              if (!customer.deleted && (customer as Stripe.Customer).email) {
                const email = (customer as Stripe.Customer).email!;
                await sendBrandedEmail(
                  supabase,
                  email,
                  "Action required — your Foreman payment failed",
                  brandedEmailHtml("Payment Failed", [
                    "We were unable to process your latest payment for Foreman.",
                    "Please update your payment method to avoid any interruption to your service.",
                    `<a href="https://quotrai.lovable.app/settings?tab=billing" style="display:inline-block;padding:10px 24px;background:#059669;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;margin:8px 0">Update Payment Method</a>`,
                    "If you believe this is an error, please contact us at support@foreman.ie.",
                  ]),
                  `payment-failed-${invoice.id}`
                );
              }
            }
          }
        }
        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout completed", { id: session.id, mode: session.mode });

        if (session.metadata?.type === "invoice_payment") {
          const invoiceId = session.metadata.invoice_id;
          const amount = (session.amount_total || 0) / 100;

          if (invoiceId) {
            await supabase
              .from("invoices")
              .update({ status: "paid", updated_at: new Date().toISOString() })
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

        if (session.mode === "subscription" && session.subscription) {
          const customerId = session.customer as string;
          const stripeSubId = typeof session.subscription === "string"
            ? session.subscription
            : session.subscription;

          const stripeSub = await stripe.subscriptions.retrieve(stripeSubId as string);
          let orgId = stripeSub.metadata?.org_id || session.metadata?.org_id;

          if (!orgId) {
            const customer = await stripe.customers.retrieve(customerId);
            if (!customer.deleted) {
              orgId = (customer as Stripe.Customer).metadata?.org_id;
            }
          }

          if (orgId) {
            await upsertSubscription(supabase, orgId, stripeSub, customerId);
            logStep("Subscription activated via checkout", { orgId });

            // Build detailed plan info from line items
            const PRICE_TO_PLAN: Record<string, string> = {
              "price_1TEa4dDQETj2awNErpoa1vHM": "Starter (Lite)",
              "price_1TEa57DQETj2awNEESev15XR": "Starter (Lite) Annual",
              "price_1TEa5SDQETj2awNE4qhL4fa7": "Pro (Connect)",
              "price_1TEa5tDQETj2awNE2zfrsMkY": "Pro (Connect) Annual",
              "price_1TEa6HDQETj2awNEycXwPCfc": "Grow",
              "price_1TEa6oDQETj2awNEHSl42OYl": "Grow Annual",
            };

            const planLines: string[] = [];
            let totalSeats = 0;
            for (const item of stripeSub.items.data) {
              const priceId = item.price.id;
              const planName = PRICE_TO_PLAN[priceId] || item.price.nickname || "Foreman";
              const qty = item.quantity || 1;
              totalSeats += qty;
              const unitAmount = item.price.unit_amount ? `€${(item.price.unit_amount / 100).toFixed(2)}` : "";
              planLines.push(`<strong>${planName}</strong> × ${qty} seat${qty !== 1 ? "s" : ""} — ${unitAmount}/${item.price.recurring?.interval || "mo"}`);
            }

            const billingInterval = stripeSub.items.data[0]?.price.recurring?.interval === "year" ? "annual" : "monthly";
            const nextBilling = new Date(stripeSub.current_period_end * 1000).toLocaleDateString("en-IE", {
              year: "numeric", month: "long", day: "numeric"
            });
            const totalAmount = session.amount_total ? `€${(session.amount_total / 100).toFixed(2)}` : "";

            // Send branded welcome email to customer
            const customer = await stripe.customers.retrieve(customerId);
            const customerEmail = !customer.deleted ? (customer as Stripe.Customer).email : session.customer_email;
            if (customerEmail) {
              await sendBrandedEmail(
                supabase,
                customerEmail,
                "Welcome to Foreman — subscription confirmed",
                brandedEmailHtml("Welcome to Foreman! 🎉", [
                  "Your subscription is now active. You have full access to all Foreman features.",
                  ...planLines,
                  `<strong>Total:</strong> ${totalAmount} (${billingInterval})`,
                  `<strong>Next billing date:</strong> ${nextBilling}`,
                  `<strong>Seats:</strong> ${totalSeats}`,
                  "You can manage your subscription, change plans, or cancel anytime from Settings → Billing.",
                  "Need help getting started? Reply to this email or reach out at support@foreman.ie."
                ]),
                `sub-welcome-${session.id}`
              );

              // Admin notification to support@foreman.ie
              await sendBrandedEmail(
                supabase,
                "support@foreman.ie",
                `New subscription: ${customerEmail}`,
                brandedEmailHtml("New Subscription 💰", [
                  `<strong>Customer:</strong> ${customerEmail}`,
                  ...planLines,
                  `<strong>Total:</strong> ${totalAmount} (${billingInterval})`,
                  `<strong>Stripe Customer:</strong> ${customerId}`,
                  `<strong>Subscription ID:</strong> ${stripeSubId}`,
                ]),
                `sub-admin-${session.id}`
              );
            }
          } else {
            logStep("WARNING: No org_id found for checkout", { stripeSubId, customerId });
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
