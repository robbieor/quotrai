import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const log = (s: string, d?: any) => console.log(`[END-TRIAL] ${s}`, d || "");

  function brandedEmailHtml(title: string, bodyLines: string[]): string {
    const bodyHtml = bodyLines.map(l => `<p style="margin:0 0 12px;color:#64748b;font-size:14px;line-height:1.6;font-family:'Manrope',Arial,sans-serif">${l}</p>`).join("");
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body style="margin:0;padding:0;background:#f4f4f5;font-family:'Manrope',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="100%" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden">
<tr><td style="background:#0f172a;padding:30px 32px;text-align:center">
<img src="https://foreman.world/foreman-logo.png" alt="Foreman" width="140" style="display:block;margin:0 auto;" />
</td></tr>
<tr><td style="padding:32px">
<h1 style="margin:0 0 16px;font-size:20px;color:#0f172a">${title}</h1>
${bodyHtml}
</td></tr>
<tr><td style="padding:16px 32px;text-align:center;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0">
© ${new Date().getFullYear()} Foreman · <a href="mailto:support@foreman.ie" style="color:#94a3b8">support@foreman.ie</a>
</td></tr></table></td></tr></table></body></html>`;
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Stripe not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    // Get org subscription
    const { data: orgMember } = await supabaseClient
      .from("org_members_v2")
      .select("org_id, role")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!orgMember?.org_id) throw new Error("User not in an organization");

    // Only owners/admins can end trial
    if (orgMember.role !== "owner" && orgMember.role !== "admin") {
      throw new Error("Only account owners can end the trial early");
    }

    const { data: subscription } = await supabaseClient
      .from("subscriptions_v2")
      .select("stripe_subscription_id, status, trial_ends_at")
      .eq("org_id", orgMember.org_id)
      .single();

    if (!subscription?.stripe_subscription_id) {
      throw new Error("No active subscription found");
    }

    if (subscription.status !== "trialing") {
      throw new Error("Subscription is not in a trial period");
    }

    log("Ending trial early", {
      subscriptionId: subscription.stripe_subscription_id,
      trialEndsAt: subscription.trial_ends_at,
    });

    const stripe = new Stripe(stripeKey, { apiVersion: "2026-02-25.clover" as any });

    // End trial immediately — Stripe will charge the customer right away
    const updated = await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      trial_end: "now",
    });

    log("Trial ended", {
      status: updated.status,
      currentPeriodEnd: updated.current_period_end,
    });

    // Update local subscription record
    await supabaseClient
      .from("subscriptions_v2")
      .update({
        status: updated.status,
        trial_ends_at: new Date().toISOString(),
        current_period_start: new Date(updated.current_period_start * 1000).toISOString(),
        current_period_end: new Date(updated.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("org_id", orgMember.org_id);

    // Send branded confirmation email
    const periodEnd = new Date(updated.current_period_end * 1000);
    const formattedDate = periodEnd.toLocaleDateString("en-IE", { day: "numeric", month: "long", year: "numeric" });

    // Get customer email from Stripe
    const customerId = updated.customer as string;
    const customer = await stripe.customers.retrieve(customerId);
    if (!customer.deleted && (customer as any).email) {
      const email = (customer as any).email;
      const html = brandedEmailHtml("Welcome Aboard — Your Subscription is Active", [
        "Your free trial has ended and your Foreman subscription is now fully active. 🎉",
        `Your first billing period runs until <strong>${formattedDate}</strong>.`,
        "You now have full access to all the tools you need to run your business — quotes, invoices, scheduling, and George AI at your side.",
        '<a href="https://foreman.world/dashboard" style="display:inline-block;padding:12px 28px;background:#059669;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;margin:8px 0">Open Foreman →</a>',
        "Thanks for choosing Foreman. We're here if you need anything — just reply to this email or reach out at support@foreman.ie.",
      ]);

      try {
        await supabaseClient.rpc("enqueue_email", {
          p_queue_name: "transactional_emails",
          p_message: JSON.stringify({
            to: email,
            subject: "Welcome aboard — your Foreman subscription is active",
            html,
            from: "Foreman <support@foreman.ie>",
            idempotency_key: `trial-ended-${subscription.stripe_subscription_id}`,
            purpose: "transactional",
          }),
        });
        log("Confirmation email enqueued", { to: email });
      } catch (e) {
        log("Email enqueue failed (non-fatal)", { error: String(e) });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: updated.status,
        current_period_end: new Date(updated.current_period_end * 1000).toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to end trial";
    log("ERROR", { message });
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
