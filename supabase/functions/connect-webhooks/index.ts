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
    // --- Invoice payment via Connect checkout ---
      case "checkout.session.completed": {
        const session = event.data.object;
        console.log(`[WEBHOOK] Checkout completed: ${session.id}, mode=${session.mode}`);

        if (session.metadata?.type === "invoice_payment") {
          const invoiceId = session.metadata.invoice_id;
          const amount = (session.amount_total || 0) / 100;

          if (invoiceId) {
            await supabaseClient
              .from("invoices")
              .update({ status: "paid", updated_at: new Date().toISOString() })
              .eq("id", invoiceId);

            const { data: inv } = await supabaseClient
              .from("invoices")
              .select("team_id, display_number, total, currency, customer_id, customers(name, email)")
              .eq("id", invoiceId)
              .single();

            if (inv) {
              await supabaseClient.from("payments").insert({
                invoice_id: invoiceId,
                team_id: inv.team_id,
                amount,
                payment_method: "card",
                notes: `Stripe Connect checkout ${session.id}`,
              });

              const curr = inv.currency?.toUpperCase() || "EUR";
              const symbol = curr === "GBP" ? "£" : curr === "USD" ? "$" : "€";
              const formattedAmount = `${symbol}${amount.toFixed(2)}`;
              const invoiceNum = inv.display_number || invoiceId.slice(0, 8);

              // Notify business owner
              const { data: ownerProfile } = await supabaseClient
                .from("profiles")
                .select("email, full_name")
                .eq("team_id", inv.team_id)
                .limit(1)
                .single();

              if (ownerProfile?.email) {
                const custName = (inv as any).customers?.name || "A customer";
                const ownerHtml = buildEmailHtml("Payment Received 💰", [
                  `<strong>${custName}</strong> has paid <strong>Invoice ${invoiceNum}</strong>.`,
                  `<strong>Amount:</strong> ${formattedAmount}`,
                  `<strong>Method:</strong> Card (online)`,
                  `The invoice has been automatically marked as paid.`,
                ]);
                try {
                  await supabaseClient.rpc("enqueue_email", {
                    p_queue_name: "transactional_emails",
                    p_message: JSON.stringify({
                      to: ownerProfile.email,
                      subject: `Payment received — Invoice ${invoiceNum} (${formattedAmount})`,
                      html: ownerHtml,
                      from: "Foreman <support@foreman.ie>",
                      idempotency_key: `connect-inv-paid-owner-${session.id}`,
                      purpose: "transactional",
                    }),
                  });
                } catch (e) { console.log("[WEBHOOK] Email enqueue failed (non-fatal)", e); }
              }

              // Receipt to customer
              const customerEmail = session.customer_email || (inv as any).customers?.email;
              const customerName = (inv as any).customers?.name || "Customer";
              if (customerEmail) {
                const receiptHtml = buildEmailHtml("Payment Confirmed ✓", [
                  `Hi ${customerName},`,
                  `Your payment of <strong>${formattedAmount}</strong> for <strong>Invoice ${invoiceNum}</strong> has been received.`,
                  `This serves as your payment receipt. No further action is required.`,
                  `Thank you for your prompt payment.`,
                ]);
                try {
                  await supabaseClient.rpc("enqueue_email", {
                    p_queue_name: "transactional_emails",
                    p_message: JSON.stringify({
                      to: customerEmail,
                      subject: `Payment confirmed — Invoice ${invoiceNum}`,
                      html: receiptHtml,
                      from: "Foreman <support@foreman.ie>",
                      idempotency_key: `connect-inv-paid-receipt-${session.id}`,
                      purpose: "transactional",
                    }),
                  });
                } catch (e) { console.log("[WEBHOOK] Email enqueue failed (non-fatal)", e); }
              }
            }
            console.log(`[WEBHOOK] Invoice payment recorded + emails sent: ${invoiceId}, amount=${amount}`);
          }
        }
        break;
      }

      // --- Subscription updated ---
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const accountId = subscription.customer_account || subscription.customer;
        console.log(`[WEBHOOK] Subscription updated: account=${accountId}, status=${subscription.status}`);
        break;
      }

      // --- Subscription deleted ---
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const accountId = subscription.customer_account || subscription.customer;
        console.log(`[WEBHOOK] Subscription deleted: account=${accountId}`);
        break;
      }

      // --- Invoice paid ---
      case "invoice.paid": {
        const invoice = event.data.object;
        const accountId = invoice.customer_account || invoice.customer;
        console.log(`[WEBHOOK] Invoice paid: account=${accountId}, amount=${invoice.amount_paid}`);
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
