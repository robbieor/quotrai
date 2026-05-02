// Executes enabled team_automations on a schedule (every 30 min via pg_cron).
// V1 supports two action types:
//  - send_quote_followup → calls send-quote-notification for quotes sent N days ago
//  - send_overdue_reminder → uses existing send-payment-reminder logic for overdue invoices
// All runs (preview or live) are logged to automation_runs.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface Automation {
  id: string;
  team_id: string;
  pattern_key: string;
  name: string;
  trigger_config: Record<string, any>;
  action_config: Record<string, any>;
  enabled: boolean;
  preview_mode: boolean;
  run_count: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  try {
    const { data: automations } = await admin
      .from("team_automations")
      .select("*")
      .eq("enabled", true);

    let processed = 0;
    let runsLogged = 0;

    for (const a of (automations ?? []) as Automation[]) {
      processed++;
      try {
        const matches = await findMatches(admin, a);
        for (const m of matches) {
          const isPreview = a.preview_mode || a.run_count < 3;
          let success = true;
          let errMsg: string | null = null;

          if (!isPreview) {
            try {
              await executeAction(a, m);
            } catch (e) {
              success = false;
              errMsg = e instanceof Error ? e.message : String(e);
            }
          }

          await admin.from("automation_runs").insert({
            automation_id: a.id,
            team_id: a.team_id,
            target_table: m.target_table,
            target_id: m.target_id,
            action: a.pattern_key,
            preview: isPreview,
            success,
            error: errMsg,
            metadata: m.metadata ?? {},
          });
          runsLogged++;
        }
        if (matches.length > 0) {
          await admin
            .from("team_automations")
            .update({ run_count: a.run_count + matches.length })
            .eq("id", a.id);
        }
      } catch (e) {
        console.error("automation eval failed", a.id, e);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, automations_processed: processed, runs_logged: runsLogged }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("run-automations error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

interface Match {
  target_table: string;
  target_id: string;
  metadata: Record<string, unknown>;
}

async function findMatches(admin: any, a: Automation): Promise<Match[]> {
  const today = new Date();
  const matches: Match[] = [];

  if (a.pattern_key === "quote_followup") {
    const daysAfter = Number(a.trigger_config?.days_after_sent ?? 3);
    const targetDay = new Date(today.getTime() - daysAfter * 86400_000)
      .toISOString().slice(0, 10);
    const dayStart = `${targetDay}T00:00:00Z`;
    const dayEnd = `${targetDay}T23:59:59Z`;

    const { data: quotes } = await admin
      .from("quotes")
      .select("id, team_id, status, updated_at, customer_id, total")
      .eq("team_id", a.team_id)
      .eq("status", "sent")
      .gte("updated_at", dayStart)
      .lte("updated_at", dayEnd)
      .limit(50);

    for (const q of quotes ?? []) {
      // Skip if already followed up by this automation
      const { data: prior } = await admin
        .from("automation_runs")
        .select("id")
        .eq("automation_id", a.id)
        .eq("target_id", q.id)
        .limit(1);
      if (prior && prior.length) continue;

      matches.push({
        target_table: "quotes",
        target_id: q.id,
        metadata: { customer_id: q.customer_id, total: q.total },
      });
    }
  }

  if (a.pattern_key === "overdue_chase") {
    const daysAfter = Number(a.trigger_config?.days_after_due ?? 1);
    const dueDate = new Date(today.getTime() - daysAfter * 86400_000)
      .toISOString().slice(0, 10);

    const { data: invs } = await admin
      .from("invoices")
      .select("id, team_id, status, due_date, customer_id, total, balance_due")
      .eq("team_id", a.team_id)
      .in("status", ["pending", "overdue", "sent"])
      .eq("due_date", dueDate)
      .limit(50);

    for (const i of invs ?? []) {
      const { data: prior } = await admin
        .from("automation_runs")
        .select("id")
        .eq("automation_id", a.id)
        .eq("target_id", i.id)
        .limit(1);
      if (prior && prior.length) continue;
      matches.push({
        target_table: "invoices",
        target_id: i.id,
        metadata: { customer_id: i.customer_id, total: i.total },
      });
    }
  }

  return matches;
}

async function executeAction(a: Automation, m: Match) {
  // Live mode delegates to existing email functions (which already have
  // outbound kill-switch + comms_settings opt-in checks).
  if (a.pattern_key === "overdue_chase") {
    const r = await fetch(
      `${SUPABASE_URL}/functions/v1/send-payment-reminder`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SERVICE_ROLE}`,
          apikey: SERVICE_ROLE,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ invoice_id: m.target_id, automated: true }),
      },
    );
    if (!r.ok) throw new Error(`send-payment-reminder ${r.status}`);
    return;
  }
  if (a.pattern_key === "quote_followup") {
    const r = await fetch(
      `${SUPABASE_URL}/functions/v1/send-quote-notification`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SERVICE_ROLE}`,
          apikey: SERVICE_ROLE,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quote_id: m.target_id,
          template: "followup",
          automated: true,
        }),
      },
    );
    if (!r.ok) throw new Error(`send-quote-notification ${r.status}`);
    return;
  }
  // recurring_customer / auto_convert_to_job: no-op in V1 — the suggestion is
  // what sells the value; we'll add execution in a follow-up.
}
