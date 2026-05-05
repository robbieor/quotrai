import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { PRICE_TO_PLAN_LABEL } from "../_shared/pricing.ts";

// Invoice statuses that may legitimately transition to "paid" via Stripe payment.
// If a checkout.session.completed event arrives for an invoice in any other state
// (draft, void, cancelled), we ignore it instead of silently flipping it to paid.
const PAYABLE_INVOICE_STATUSES = new Set(["sent", "overdue", "partially_paid", "viewed"]);

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
  const bodyHtml = bodyLines.map(l => `<p style="margin:0 0 12px;color:#64748b;font-size:14px;line-height:1.6;font-family:'Manrope',Arial,sans-serif">${l}</p>`).join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body style="margin:0;padding:0;background:#f4f4f5;font-family:'Manrope',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="100%" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden">
<tr><td style="background:#0f172a;padding:30px 32px;text-align:center">
<img src="https://revamo.ai/foreman-logo.png" alt="revamo" width="140" style="display:block;margin:0 auto;" />
</td></tr>
<tr><td style="padding:32px">
<h1 style="margin:0 0 16px;font-size:20px;color:#0f172a">${title}</h1>
${bodyHtml}
</td></tr>
<tr><td style="padding:16px 32px;text-align:center;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0">
© ${new Date().getFullYear()} revamo · <a href="mailto:support@foreman.ie" style="color:#94a3b8">support@foreman.ie</a>
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
        from: "revamo <noreply@notify.revamo.ai>",
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

  // DB constraint requires "monthly" / "annual" — Stripe returns "month" / "year"
  const billingPeriod: "monthly" | "annual" =
    subscription.items.data[0]?.price.recurring?.interval === "year" ? "annual" : "monthly";

  await supabase.from("subscriptions_v2").upsert(
    {
      org_id: orgId,
      status: subscription.status,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: customerId,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      seat_count: totalSeats,
      billing_period: billingPeriod,
      trial_ends_at: trialEnd,
      cancel_at_period_end: subscription.cancel_at_period_end ?? false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "org_id" }
  );

  logStep("subscriptions_v2 upserted", {
    orgId,
    status: subscription.status,
    seats: totalSeats,
    billing: billingPeriod,
  });
}

serve(async (req) => {
  // Diagnostic: log EVERY hit to this endpoint, even before signature verification.
  // Helps diagnose whether Stripe is reaching us at all.
  logStep("HTTP request received", {
    method: req.method,
    hasSignature: !!req.headers.get("stripe-signature"),
    userAgent: req.headers.get("user-agent")?.slice(0, 80) ?? null,
  });

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!stripeKey || !webhookSecret) {
      logStep("ERROR: Missing Stripe configuration", {
        hasStripeKey: !!stripeKey,
        hasWebhookSecret: !!webhookSecret,
      });
      throw new Error("Missing Stripe configuration");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      logStep("ERROR: No stripe-signature header — likely manual/browser hit");
      throw new Error("Missing stripe-signature header");
    }

    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    logStep("Event verified", { type: event.type, id: event.id, livemode: event.livemode });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    switch (event.type) {
      case "customer.subscription.trial_will_end": {
        // Fired ~3 days before trial_end. Email the customer.
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        logStep("Trial will end soon", { id: subscription.id, trialEnd: subscription.trial_end });

        const customer = await stripe.customers.retrieve(customerId);
        if (!customer.deleted && (customer as Stripe.Customer).email) {
          const email = (customer as Stripe.Customer).email!;
          const trialEndDate = subscription.trial_end
            ? new Date(subscription.trial_end * 1000).toLocaleDateString("en-IE", {
                year: "numeric", month: "long", day: "numeric",
              })
            : "soon";
          await sendBrandedEmail(
            supabase,
            email,
            "Your revamo trial ends soon",
            brandedEmailHtml("Your trial is ending soon", [
              `Heads up — your revamo free trial ends on <strong>${trialEndDate}</strong>.`,
              "Your subscription will start automatically using the payment method on file. No action needed if you'd like to keep going.",
              "Want to change your plan or update your card? You can do that anytime from Settings → Billing.",
              '<a href="https://revamo.ai/settings?tab=billing" style="display:inline-block;padding:12px 28px;background:#00E6A0;color:#0f172a;text-decoration:none;border-radius:12px;font-weight:600;margin:8px 0">Manage Billing</a>',
              "If you've decided revamo isn't for you, just cancel from the same page before the trial ends and you won't be charged.",
            ]),
            `trial-ending-${subscription.id}`
          );
        }
        break;
      }

      case "charge.refunded": {
        // A charge was refunded (full or partial). If it was tied to one of our
        // invoices, record the refund as a negative payment so the balance
        // reflects reality.
        const charge = event.data.object as Stripe.Charge;
        const refundedAmount = (charge.amount_refunded || 0) / 100;
        logStep("Charge refunded", {
          id: charge.id,
          amountRefunded: refundedAmount,
          paymentIntent: charge.payment_intent,
        });

        // Try to find the originating invoice via the checkout session's payment_intent
        const piId = typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent?.id;
        if (!piId) {
          logStep("Refund: no payment_intent on charge — skipping", { chargeId: charge.id });
          break;
        }

        // Find the original payment row by stripe session note
        const sessions = await stripe.checkout.sessions.list({ payment_intent: piId, limit: 1 });
        const session = sessions.data[0];
        if (!session?.metadata?.invoice_id) {
          logStep("Refund: no matching checkout session with invoice_id", { piId });
          break;
        }

        const invoiceId = session.metadata.invoice_id;
        const refundNote = `Stripe refund ${charge.id}`;

        const { data: inv } = await supabase
          .from("invoices")
          .select("team_id, status, total")
          .eq("id", invoiceId)
          .single();

        if (!inv) {
          logStep("Refund: invoice not found", { invoiceId });
          break;
        }

        // Insert a negative payment row (idempotent via uq_payments_invoice_notes)
        const { error: refundErr } = await supabase.from("payments").insert({
          invoice_id: invoiceId,
          team_id: inv.team_id,
          amount: -refundedAmount,
          payment_method: "card",
          notes: refundNote,
        });
        if (refundErr && (refundErr as any).code !== "23505") {
          logStep("ERROR inserting refund payment", { invoiceId, error: refundErr.message });
          throw refundErr;
        }

        // If fully refunded, flip invoice status back to "sent" so it appears
        // outstanding again — owner can void or follow up.
        const fullyRefunded = refundedAmount >= Number(inv.total || 0);
        if (fullyRefunded) {
          await supabase
            .from("invoices")
            .update({ status: "sent", updated_at: new Date().toISOString() })
            .eq("id", invoiceId);
        }
        logStep("Refund recorded", { invoiceId, refundedAmount, fullyRefunded });
        break;
      }

      case "invoice.payment_action_required": {
        // 3DS / SCA challenge — customer must authenticate. Notify them.
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === "string"
          ? invoice.customer
          : invoice.customer?.id;
        if (!customerId) break;

        const customer = await stripe.customers.retrieve(customerId);
        if (!customer.deleted && (customer as Stripe.Customer).email) {
          const email = (customer as Stripe.Customer).email!;
          await sendBrandedEmail(
            supabase,
            email,
            "Action required — confirm your revamo payment",
            brandedEmailHtml("Confirm your payment", [
              "Your bank needs you to confirm your latest revamo payment (3D Secure).",
              "Until you confirm, the payment hasn't gone through. Tap below to complete it.",
              `<a href="${invoice.hosted_invoice_url || 'https://revamo.ai/settings?tab=billing'}" style="display:inline-block;padding:12px 28px;background:#00E6A0;color:#0f172a;text-decoration:none;border-radius:12px;font-weight:600;margin:8px 0">Confirm Payment</a>`,
              "If you don't recognise this, ignore the email and contact support@foreman.ie.",
            ]),
            `payment-action-required-${invoice.id}`
          );
        }
        break;
      }

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
              "Your revamo subscription has been cancelled",
              brandedEmailHtml("Subscription Cancelled", [
                "Your revamo subscription has been cancelled.",
                "Your access will continue until the end of your current billing period.",
                "If this was a mistake or you'd like to resubscribe, you can do so anytime from your Settings page.",
                "Thanks for being part of revamo. We'd love to have you back."
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
                  "Action required — your revamo payment failed",
                  brandedEmailHtml("Payment Failed", [
                    "We were unable to process your latest payment for revamo.",
                    "Please update your payment method to avoid any interruption to your service.",
                    '<a href="https://revamo.ai/settings?tab=billing" style="display:inline-block;padding:12px 28px;background:#00E6A0;color:#0f172a;text-decoration:none;border-radius:12px;font-weight:600;margin:8px 0">Update Payment Method</a>',
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
            // Re-read the invoice and only flip to paid if it was in a payable
            // state. This prevents draft/void invoices from being marked paid
            // by a stale or replayed Stripe event.
            const { data: existing } = await supabase
              .from("invoices")
              .select("status")
              .eq("id", invoiceId)
              .single();

            if (!existing) {
              logStep("Invoice not found for payment session", { invoiceId });
              break;
            }

            if (existing.status === "paid") {
              logStep("Invoice already paid — skipping duplicate webhook", { invoiceId });
              break;
            }

            if (!PAYABLE_INVOICE_STATUSES.has(existing.status)) {
              logStep("Refusing to mark non-payable invoice as paid", {
                invoiceId,
                status: existing.status,
              });
              break;
            }

            await supabase
              .from("invoices")
              .update({ status: "paid", updated_at: new Date().toISOString() })
              .eq("id", invoiceId);

            const { data: inv } = await supabase
              .from("invoices")
              .select("team_id, display_number, total, currency, customer_id, customers(name, email)")
              .eq("id", invoiceId)
              .single();

            if (inv) {
              // Idempotent insert — uq_payments_invoice_notes guarantees a
              // single row per (invoice_id, "Stripe checkout cs_..."). If
              // Stripe retries the same event we silently skip the duplicate.
              const paymentNote = `Stripe checkout ${session.id}`;
              const { error: payErr } = await supabase.from("payments").insert({
                invoice_id: invoiceId,
                team_id: inv.team_id,
                amount,
                payment_method: "card",
                notes: paymentNote,
              });

              if (payErr) {
                // Postgres unique_violation = 23505 → expected on Stripe retry
                if ((payErr as any).code === "23505") {
                  logStep("Duplicate payment webhook — already recorded", { invoiceId, sessionId: session.id });
                  break;
                }
                logStep("ERROR inserting payment", { invoiceId, error: payErr.message });
                throw payErr;
              }

              // Format currency amount
              const curr = inv.currency?.toUpperCase() || "EUR";
              const symbol = curr === "GBP" ? "£" : curr === "USD" ? "$" : "€";
              const formattedAmount = `${symbol}${amount.toFixed(2)}`;
              const invoiceNum = inv.display_number || invoiceId.slice(0, 8);

              // --- Email 1: Notify business owner ---
              const { data: ownerProfile } = await supabase
                .from("profiles")
                .select("email, full_name")
                .eq("team_id", inv.team_id)
                .limit(1)
                .single();

              if (ownerProfile?.email) {
                const customerName = (inv as any).customers?.name || "A customer";
                await sendBrandedEmail(
                  supabase,
                  ownerProfile.email,
                  `Payment received — Invoice ${invoiceNum} (${formattedAmount})`,
                  brandedEmailHtml("Payment Received 💰", [
                    `<strong>${customerName}</strong> has paid <strong>Invoice ${invoiceNum}</strong>.`,
                    `<strong>Amount:</strong> ${formattedAmount}`,
                    `<strong>Method:</strong> Card (online)`,
                    `The invoice has been automatically marked as paid.`,
                    '<a href="https://revamo.ai/invoices" style="display:inline-block;padding:12px 28px;background:#00E6A0;color:#0f172a;text-decoration:none;border-radius:12px;font-weight:600;margin:8px 0">View Invoices</a>',
                  ]),
                  `inv-paid-owner-${session.id}`
                );
              }

              // --- Email 2: Receipt to customer ---
              const customerEmail = session.customer_email || (inv as any).customers?.email;
              const customerName = (inv as any).customers?.name || "Customer";
              if (customerEmail) {
                await sendBrandedEmail(
                  supabase,
                  customerEmail,
                  `Payment confirmed — Invoice ${invoiceNum}`,
                  brandedEmailHtml("Payment Confirmed ✓", [
                    `Hi ${customerName},`,
                    `Your payment of <strong>${formattedAmount}</strong> for <strong>Invoice ${invoiceNum}</strong> has been received.`,
                    `This serves as your payment receipt. No further action is required.`,
                    `If you have any questions, please contact the team directly.`,
                    `Thank you for your prompt payment.`,
                  ]),
                  `inv-paid-receipt-${session.id}`
                );
              }
            }
            logStep("Invoice payment recorded + emails sent", { invoiceId, amount });
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

            // Build detailed plan info from line items using shared price-label map.
            const planLines: string[] = [];
            let totalSeats = 0;
            for (const item of stripeSub.items.data) {
              const priceId = item.price.id;
              const planName = PRICE_TO_PLAN_LABEL[priceId] || item.price.nickname || "revamo";
              const qty = item.quantity || 1;
              totalSeats += qty;
              const currency = (item.price.currency || "eur").toUpperCase();
              const symbol = currency === "GBP" ? "£" : currency === "USD" ? "$" : "€";
              const unitAmount = item.price.unit_amount
                ? `${symbol}${(item.price.unit_amount / 100).toFixed(2)}`
                : "";
              const interval = item.price.recurring?.interval === "year" ? "yr" : "mo";
              planLines.push(`<strong>${planName}</strong> × ${qty} — ${unitAmount}/${interval}`);
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
                "Welcome to revamo — subscription confirmed",
                brandedEmailHtml("Welcome to revamo! 🎉", [
                  "Your subscription is now active. You have full access to all revamo features.",
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

    // 400 only for signature/parse problems Stripe shouldn't retry.
    // Everything else (DB hiccups, transient errors) returns 500 so Stripe
    // retries with exponential backoff for up to 3 days.
    const isSignatureError =
      msg.includes("stripe-signature") ||
      msg.includes("Missing Stripe configuration") ||
      msg.includes("No signatures found") ||
      msg.includes("Webhook payload");
    const status = isSignatureError ? 400 : 500;

    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
