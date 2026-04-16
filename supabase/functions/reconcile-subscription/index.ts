// Fallback reconciliation: pulls the latest Stripe subscription/session
// for the authenticated user's org and writes it to subscriptions_v2.
// Used by /subscription-confirmed when the webhook is slow/missing.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (s: string, d?: any) => console.log(`[RECONCILE-SUB] ${s}`, d ? JSON.stringify(d) : "");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Stripe not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) throw new Error("Unauthorized");

    const body = await req.json().catch(() => ({}));
    const sessionId: string | undefined = body?.sessionId;

    // Resolve org
    const { data: orgMember } = await supabase
      .from("org_members_v2")
      .select("org_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();
    if (!orgMember?.org_id) throw new Error("No org for user");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Strategy 1: explicit checkout session lookup (most reliable post-checkout)
    let stripeSub: Stripe.Subscription | null = null;
    let customerId: string | null = null;

    if (sessionId) {
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
          expand: ["subscription", "customer"],
        });
        if (session.subscription && typeof session.subscription !== "string") {
          stripeSub = session.subscription;
        } else if (typeof session.subscription === "string") {
          stripeSub = await stripe.subscriptions.retrieve(session.subscription);
        }
        customerId = typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
        log("Resolved via session", { sessionId, hasSub: !!stripeSub });
      } catch (e) {
        log("Session lookup failed, falling back to email", { error: String(e) });
      }
    }

    // Strategy 2: find by customer email
    if (!stripeSub && user.email) {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        const subs = await stripe.subscriptions.list({
          customer: customerId,
          status: "all",
          limit: 5,
        });
        // Prefer active/trialing
        stripeSub =
          subs.data.find((s) => ["active", "trialing", "past_due"].includes(s.status)) ||
          subs.data[0] ||
          null;
        log("Resolved via email", { email: user.email, found: !!stripeSub });
      }
    }

    if (!stripeSub || !customerId) {
      return new Response(
        JSON.stringify({ reconciled: false, reason: "No Stripe subscription found yet" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const totalSeats = stripeSub.items.data.reduce((sum, it) => sum + (it.quantity || 0), 0);
    const trialEnd = stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000).toISOString() : null;
    const billingInterval = stripeSub.items.data[0]?.price.recurring?.interval === "year" ? "year" : "month";

    const { error: upsertErr } = await supabase.from("subscriptions_v2").upsert(
      {
        org_id: orgMember.org_id,
        status: stripeSub.status,
        stripe_subscription_id: stripeSub.id,
        stripe_customer_id: customerId,
        current_period_start: new Date(stripeSub.current_period_start * 1000).toISOString(),
        current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
        seat_count: totalSeats,
        billing_period: billingInterval,
        trial_ends_at: trialEnd,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "org_id" }
    );
    if (upsertErr) throw upsertErr;

    log("Reconciled", { orgId: orgMember.org_id, status: stripeSub.status, seats: totalSeats });

    return new Response(
      JSON.stringify({
        reconciled: true,
        status: stripeSub.status,
        subscription_id: stripeSub.id,
        seat_count: totalSeats,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Reconcile failed";
    log("ERROR", { msg });
    return new Response(JSON.stringify({ reconciled: false, error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
