/**
 * Lightweight analytics funnel tracker.
 * Logs events to the backend `analytics_events` table
 * and fires a `CustomEvent` on `window` so third-party
 * pixels (GA4, Meta CAPI, etc.) can listen in one place.
 *
 * Usage:
 *   import { track } from "@/utils/analytics";
 *   track("signup_started", { method: "google" });
 */

import { supabase } from "@/integrations/supabase/client";
import { getUtmParams } from "@/utils/utm";

export type FunnelEvent =
  | "landing_page_view"
  | "cta_click"
  | "signup_started"
  | "signup_completed"
  | "onboarding_step"
  | "onboarding_completed"
  | "onboarding_first_quote_skipped"
  | "onboarding_first_quote_created"
  | "trial_started"
  | "first_quote_created"
  | "first_invoice_created"
  | "checkout_started"
  | "subscription_activated"
  | "referral_shared"
  | "trade_landing_view"
  | "foreman_ai_first_use"
  | "checklist_item_completed"
  | "checklist_100_percent"
  | "checklist_dismissed";

interface TrackOptions {
  /** Arbitrary key-value metadata */
  [key: string]: string | number | boolean | null | undefined;
}

export async function track(event: FunnelEvent, properties?: TrackOptions) {
  // 1. Fire browser custom event (for GA4 / Meta pixel listeners)
  try {
    window.dispatchEvent(
      new CustomEvent("quotr_analytics", { detail: { event, ...properties } })
    );
  } catch {
    // SSR / non-browser – ignore
  }

  // 2. Persist to DB (best-effort, no await blocking UI)
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id ?? null;

    // Use raw rpc/fetch to avoid TypeScript strict table typing
    // since analytics_events is a new table not yet in generated types
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    await fetch(`${supabaseUrl}/rest/v1/analytics_events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseKey,
        Authorization: session?.access_token
          ? `Bearer ${session.access_token}`
          : `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        event_name: event,
        user_id: userId,
        properties: JSON.stringify({ ...getUtmParams(), ...properties }),
        page_url: typeof window !== "undefined" ? window.location.pathname : null,
      }),
    });
  } catch (err) {
    // Silent fail – analytics should never break the app
    console.debug("[analytics]", event, err);
  }
}
