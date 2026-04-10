import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.6.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

// No CORS needed — webhooks are server-to-server from Stripe

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not configured.");
    const stripeClient = new Stripe(stripeKey);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.text();
    const sig = req.headers.get("stripe-signature");
    if (!sig) throw new Error("Missing stripe-signature header");

    // Determine which webhook secret to use
    // V2 thin events use STRIPE_CONNECT_WEBHOOK_SECRET
    // Standard events use STRIPE_WEBHOOK_SECRET
    const connectWebhookSecret = Deno.env.get("STRIPE_CONNECT_WEBHOOK_SECRET");
    const standardWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    // ========================================================
    // Try parsing as a V2 Thin Event first
    // Thin events are lightweight — they contain only the event ID and type.
    // You must fetch the full event data separately.
    // Set up in Stripe Dashboard → Developers → Webhooks → Connected accounts → Thin
    // Listen for:
    //   - v2.core.account[requirements].updated
    //   - v2.core.account[configuration.merchant].capability_status_updated
    //   - v2.core.account[configuration.customer].capability_status_updated
    //
    // Local testing with Stripe CLI:
    //   stripe listen --thin-events \
    //     'v2.core.account[requirements].updated,v2.core.account[configuration.merchant].capability_status_updated' \
    //     --forward-thin-to http://localhost:54321/functions/v1/connect-webhooks
    // ========================================================
    if (connectWebhookSecret) {
      try {
        const thinEvent = stripeClient.parseThinEvent(body, sig, connectWebhookSecret);

        console.log(`[V2 THIN EVENT] type=${thinEvent.type}, id=${thinEvent.id}`);

        // Fetch the full event data to get details
        const event = await stripeClient.v2.core.events.retrieve(thinEvent.id);

        // --- Handle V2 Account Requirements Updated ---
        if (event.type === "v2.core.account[requirements].updated") {
          console.log("[WEBHOOK] Account requirements changed, checking status...");
          // The related_object contains the account ID
          const accountId = thinEvent.related_object?.id;
          if (accountId) {
            // Re-check the account status and update DB
            const account = await stripeClient.v2.core.accounts.retrieve(accountId, {
              include: ["configuration.merchant", "requirements"],
            });
            const cardPaymentsActive = account?.configuration?.merchant?.capabilities?.card_payments?.status === "active";
            const reqStatus = account?.requirements?.summary?.minimum_deadline?.status;
            const isComplete = cardPaymentsActive && reqStatus !== "currently_due" && reqStatus !== "past_due";

            // Update teams table — find team by connect account ID
            await supabaseClient
              .from("teams")
              .update({ stripe_connect_onboarding_complete: isComplete })
              .eq("stripe_connect_account_id", accountId);

            console.log(`[WEBHOOK] Account ${accountId} onboarding_complete=${isComplete}`);
          }
        }

        // --- Handle V2 Capability Status Updates ---
        if (
          event.type === "v2.core.account[configuration.merchant].capability_status_updated" ||
          event.type === "v2.core.account[configuration.customer].capability_status_updated"
        ) {
          console.log(`[WEBHOOK] Capability status updated: ${event.type}`);
          const accountId = thinEvent.related_object?.id;
          if (accountId) {
            const account = await stripeClient.v2.core.accounts.retrieve(accountId, {
              include: ["configuration.merchant", "requirements"],
            });
            const isActive = account?.configuration?.merchant?.capabilities?.card_payments?.status === "active";
            await supabaseClient
              .from("teams")
              .update({ stripe_connect_onboarding_complete: isActive })
              .eq("stripe_connect_account_id", accountId);
            console.log(`[WEBHOOK] Capability update for ${accountId}, active=${isActive}`);
          }
        }

        return new Response(JSON.stringify({ received: true }), { status: 200 });
      } catch (thinErr) {
        // Not a thin event — fall through to standard event parsing
        console.log("[WEBHOOK] Not a thin event, trying standard event parsing...");
      }
    }

    // ========================================================
    // Standard (non-thin) webhook events for subscriptions
    // These come from the platform's own webhook endpoint
    // ========================================================
    if (!standardWebhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET not configured for standard events");
    }

    const event = stripeClient.webhooks.constructEvent(body, sig, standardWebhookSecret);
    console.log(`[STANDARD EVENT] type=${event.type}, id=${event.id}`);

    switch (event.type) {
      // --- Subscription updated (upgrade, downgrade, quantity change, pause, cancel_at_period_end) ---
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        // For V2 accounts, use customer_account instead of customer
        const accountId = subscription.customer_account || subscription.customer;
        const status = subscription.status;
        const cancelAtPeriodEnd = subscription.cancel_at_period_end;
        const priceId = subscription.items?.data?.[0]?.price?.id;
        const productId = subscription.items?.data?.[0]?.price?.product;

        console.log(`[WEBHOOK] Subscription updated: account=${accountId}, status=${status}, cancel_at_period_end=${cancelAtPeriodEnd}`);

        // TODO: Update your database with the new subscription state
        // Example: await supabaseClient.from("subscriptions").upsert({
        //   account_id: accountId,
        //   status,
        //   cancel_at_period_end: cancelAtPeriodEnd,
        //   price_id: priceId,
        //   product_id: productId,
        //   updated_at: new Date().toISOString(),
        // });

        // Handle pause_collection changes
        if (subscription.pause_collection) {
          console.log(`[WEBHOOK] Subscription paused, resumes_at=${subscription.pause_collection.resumes_at}`);
        }
        break;
      }

      // --- Subscription deleted (cancelled) ---
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const accountId = subscription.customer_account || subscription.customer;
        console.log(`[WEBHOOK] Subscription deleted: account=${accountId}`);

        // TODO: Revoke access for the connected account
        // Example: await supabaseClient.from("subscriptions")
        //   .update({ status: "canceled", updated_at: new Date().toISOString() })
        //   .eq("account_id", accountId);
        break;
      }

      // --- Invoice paid ---
      case "invoice.paid": {
        const invoice = event.data.object;
        const accountId = invoice.customer_account || invoice.customer;
        console.log(`[WEBHOOK] Invoice paid: account=${accountId}, amount=${invoice.amount_paid}`);
        // TODO: Record payment in your database
        break;
      }

      // --- Payment method events ---
      case "payment_method.attached": {
        console.log(`[WEBHOOK] Payment method attached: ${event.data.object.id}`);
        break;
      }
      case "payment_method.detached": {
        console.log(`[WEBHOOK] Payment method detached: ${event.data.object.id}`);
        break;
      }

      // --- Customer updated ---
      case "customer.updated": {
        const customer = event.data.object;
        console.log(`[WEBHOOK] Customer updated: ${customer.id}`);
        // Check invoice_settings.default_payment_method for payment method changes
        // Do NOT use billing email as a login credential
        break;
      }

      // --- Billing portal events ---
      case "billing_portal.configuration.created":
      case "billing_portal.configuration.updated":
      case "billing_portal.session.created": {
        console.log(`[WEBHOOK] Billing portal event: ${event.type}`);
        break;
      }

      // --- Tax ID events ---
      case "customer.tax_id.created":
      case "customer.tax_id.deleted":
      case "customer.tax_id.updated": {
        console.log(`[WEBHOOK] Tax ID event: ${event.type}`);
        break;
      }

      default:
        console.log(`[WEBHOOK] Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    console.error("Connect Webhooks error:", error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
});
