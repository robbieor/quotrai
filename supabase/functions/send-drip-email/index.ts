import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/**
 * send-drip-email
 *
 * Called on a schedule (cron) to send post-signup nurture emails.
 * Reads from `drip_queue`, sends via Resend, marks sent.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = "Quotr <hello@quotr.ie>";

interface DripRow {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  drip_step: number;
  send_at: string;
}

const DRIP_TEMPLATES: Record<number, { subject: string; body: (name: string) => string }> = {
  1: {
    subject: "Create your first quote in 60 seconds ⚡",
    body: (name) => `Hi ${name},\n\nWelcome to Quotr! The easiest way to get started is to create your first quote.\n\nHead to Quotes → New Quote and pick one of your trade-specific templates. Add a customer, adjust the line items, and send — all in under a minute.\n\nOr just tell Foreman AI: "Create a quote for [customer name] using the [template] template"\n\nHappy quoting!\n— The Quotr Team`,
  },
  2: {
    subject: "Meet Foreman AI — your hands-free assistant 🤖",
    body: (name) => `Hey ${name},\n\nDid you know Quotr comes with a built-in AI assistant?\n\nForeman AI can create quotes, schedule jobs, log expenses, send invoice reminders, and more — all by voice or text.\n\nTry it: Go to the Foreman AI page and say "What can you do?"\n\nIt understands trade terminology and gets smarter every week.\n\n— The Quotr Team`,
  },
  3: {
    subject: "How much admin time could you save? 📊",
    body: (name) => `Hi ${name},\n\nTradespeople using Quotr save an average of 10 hours per week on admin.\n\nCurious what that means for your business? Try our ROI calculator on the homepage — just enter your team size and hourly rate.\n\nhttps://quotrai.lovable.app/#pricing\n\nThe numbers might surprise you.\n\n— The Quotr Team`,
  },
  4: {
    subject: "Your free trial ends in 2 days ⏰",
    body: (name) => `Hi ${name},\n\nJust a heads-up — your 14-day Quotr trial ends soon.\n\nTo keep all your data, templates, and AI access, subscribe from Settings → Billing.\n\n✅ No long-term contract\n✅ Cancel anytime\n✅ All features included\n\nIf you have any questions, just reply to this email.\n\n— The Quotr Team`,
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // ──────────────────────────────────────────────────────────
  // COMMUNICATION SAFETY: Global kill switch
  // ──────────────────────────────────────────────────────────
  const outboundEnabled = Deno.env.get("OUTBOUND_COMMUNICATION_ENABLED") === "true";
  if (!outboundEnabled) {
    console.log("[SAFETY] send-drip-email blocked: OUTBOUND_COMMUNICATION_ENABLED is false");
    return new Response(JSON.stringify({ sent: 0, blocked: true, reason: "kill_switch" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date().toISOString();
    const { data: queue, error: fetchError } = await supabase
      .from("drip_queue")
      .select("*")
      .eq("sent", false)
      .lte("send_at", now)
      .limit(50);

    if (fetchError) throw fetchError;
    if (!queue || queue.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sentCount = 0;

    for (const row of queue as DripRow[]) {
      const template = DRIP_TEMPLATES[row.drip_step];
      if (!template) continue;

      const name = row.full_name?.split(" ")[0] || "there";

      if (RESEND_API_KEY) {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: [row.email],
            subject: template.subject,
            text: template.body(name),
          }),
        });

        if (!res.ok) {
          console.error(`Failed to send drip ${row.drip_step} to ${row.email}:`, await res.text());
          continue;
        }
      } else {
        console.log(`[DRY RUN] Would send drip ${row.drip_step} to ${row.email}`);
      }

      await supabase
        .from("drip_queue")
        .update({ sent: true, sent_at: new Date().toISOString() })
        .eq("id", row.id);

      sentCount++;
    }

    return new Response(JSON.stringify({ sent: sentCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed";
    console.error("Drip email error:", error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
