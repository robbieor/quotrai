// Detects repeating user patterns and writes proposed automations to
// `automation_suggestions`. Runs nightly via pg_cron. Pure SQL — no AI.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Suggestion = {
  team_id: string;
  pattern_key: string;
  title: string;
  description: string;
  evidence: Record<string, unknown>;
  confidence: number;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const since = new Date(Date.now() - 30 * 86400_000).toISOString();
    const suggestions: Suggestion[] = [];

    // ── Pattern 1: manual quote follow-ups (3+ in 30d, sent 2-7 days after a quote)
    const { data: quoteFollowups } = await admin
      .from("comms_audit_log")
      .select("team_id, record_id, attempted_at, manual_send")
      .eq("record_type", "quote")
      .eq("manual_send", true)
      .eq("allowed", true)
      .gte("attempted_at", since)
      .limit(5000);

    const fByTeamQ = new Map<string, number>();
    (quoteFollowups ?? []).forEach((r: any) => {
      if (!r.team_id) return;
      fByTeamQ.set(r.team_id, (fByTeamQ.get(r.team_id) ?? 0) + 1);
    });
    for (const [team_id, count] of fByTeamQ) {
      if (count < 3) continue;
      suggestions.push({
        team_id,
        pattern_key: "quote_followup",
        title: "Auto-follow-up on quotes after 3 days",
        description:
          `You've manually followed up on ${count} quotes in the last 30 days. revamo can send these for you 3 days after the quote goes out, with a friendly tone, unless the customer's already replied.`,
        evidence: { manual_followups_30d: count },
        confidence: Math.min(0.5 + count * 0.05, 0.95),
      });
    }

    // ── Pattern 2: manual overdue chases on invoices
    const { data: invFollowups } = await admin
      .from("comms_audit_log")
      .select("team_id, attempted_at")
      .eq("record_type", "invoice")
      .eq("manual_send", true)
      .eq("allowed", true)
      .gte("attempted_at", since)
      .limit(5000);

    const fByTeamI = new Map<string, number>();
    (invFollowups ?? []).forEach((r: any) => {
      if (!r.team_id) return;
      fByTeamI.set(r.team_id, (fByTeamI.get(r.team_id) ?? 0) + 1);
    });
    for (const [team_id, count] of fByTeamI) {
      if (count < 3) continue;
      suggestions.push({
        team_id,
        pattern_key: "overdue_chase",
        title: "Auto-chase overdue invoices the day after due date",
        description:
          `You've manually chased ${count} overdue invoices recently. revamo can send a polite reminder the day after an invoice goes overdue, then escalate at 7 and 14 days.`,
        evidence: { manual_chases_30d: count },
        confidence: Math.min(0.55 + count * 0.05, 0.95),
      });
    }

    // ── Pattern 3: recurring customers (same customer, ≥3 jobs in 90d)
    const since90 = new Date(Date.now() - 90 * 86400_000).toISOString();
    const { data: recurJobs } = await admin
      .from("jobs")
      .select("team_id, customer_id, created_at")
      .gte("created_at", since90)
      .limit(10000);

    const byPair = new Map<string, { team_id: string; customer_id: string; count: number }>();
    (recurJobs ?? []).forEach((j: any) => {
      if (!j.team_id || !j.customer_id) return;
      const k = `${j.team_id}::${j.customer_id}`;
      const cur = byPair.get(k) ?? { team_id: j.team_id, customer_id: j.customer_id, count: 0 };
      cur.count += 1;
      byPair.set(k, cur);
    });
    const recurringByTeam = new Map<string, number>();
    for (const v of byPair.values()) {
      if (v.count >= 3) {
        recurringByTeam.set(v.team_id, (recurringByTeam.get(v.team_id) ?? 0) + 1);
      }
    }
    for (const [team_id, count] of recurringByTeam) {
      suggestions.push({
        team_id,
        pattern_key: "recurring_customer",
        title: `Flag recurring customers (${count} found)`,
        description:
          `${count} of your customers have booked 3+ jobs in 90 days. revamo can flag them as recurring, suggest service plans, and remind you to schedule the next visit before they call.`,
        evidence: { recurring_customer_count: count },
        confidence: Math.min(0.6 + count * 0.04, 0.9),
      });
    }

    // ── Pattern 4: high quote→job conversion (≥80% of accepted in 30d)
    const { data: acceptedQuotes } = await admin
      .from("quotes")
      .select("team_id, id, status, updated_at")
      .eq("status", "accepted")
      .gte("updated_at", since)
      .limit(10000);

    const accByTeam = new Map<string, number>();
    (acceptedQuotes ?? []).forEach((q: any) => {
      accByTeam.set(q.team_id, (accByTeam.get(q.team_id) ?? 0) + 1);
    });
    const { data: convQuotes } = await admin
      .from("quotes")
      .select("team_id, status")
      .eq("status", "converted")
      .gte("updated_at", since)
      .limit(10000);
    const convByTeam = new Map<string, number>();
    (convQuotes ?? []).forEach((q: any) => {
      convByTeam.set(q.team_id, (convByTeam.get(q.team_id) ?? 0) + 1);
    });
    for (const [team_id, accepted] of accByTeam) {
      if (accepted < 5) continue;
      const converted = convByTeam.get(team_id) ?? 0;
      const total = accepted + converted;
      const rate = total === 0 ? 0 : converted / total;
      if (rate >= 0.8) {
        suggestions.push({
          team_id,
          pattern_key: "auto_convert_to_job",
          title: "Auto-convert accepted quotes to jobs",
          description: `${Math.round(rate * 100)}% of your accepted quotes get turned into jobs. revamo can do that step for you the moment a quote is accepted, and you'll just see the new job ready to schedule.`,
          evidence: { accepted: total, converted, conversion_rate: rate },
          confidence: 0.85,
        });
      }
    }

    // ── Insert/refresh suggestions (skip duplicates with status=pending|enabled)
    let upserted = 0;
    for (const s of suggestions) {
      // Don't recreate if pending or enabled already exists
      const { data: existing } = await admin
        .from("automation_suggestions")
        .select("id, status")
        .eq("team_id", s.team_id)
        .eq("pattern_key", s.pattern_key)
        .in("status", ["pending", "enabled"])
        .maybeSingle();
      if (existing) continue;

      const { error } = await admin.from("automation_suggestions").insert({
        team_id: s.team_id,
        pattern_key: s.pattern_key,
        title: s.title,
        description: s.description,
        evidence: s.evidence,
        confidence: s.confidence,
        status: "pending",
      });
      if (!error) upserted++;
      else console.error("insert suggestion error:", error);
    }

    return new Response(
      JSON.stringify({ ok: true, evaluated: suggestions.length, written: upserted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("pattern-detector error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
