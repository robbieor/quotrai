// Revamo Daily Briefing - generates an Insight → Impact → Action briefing
// using Lovable AI Gateway (Gemini 2.5 Flash) and caches per team per day.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const STALE_HOURS = 6;

interface BriefingContent {
  headline: string;
  priorities: { title: string; impact: string; action: string }[];
  revenue_at_risk: string;
  workforce: string;
  overnight: string;
  metrics_snapshot: Record<string, number | string>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth-bound client to identify the user
    const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { data: profile } = await admin
      .from("profiles")
      .select("team_id, full_name, trade_type, country, company_name, currency")
      .eq("id", user.id)
      .single();

    if (!profile?.team_id) {
      return new Response(JSON.stringify({ error: "no team" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { force } = await req.json().catch(() => ({ force: false }));

    const today = new Date().toISOString().slice(0, 10);

    // Cache check
    if (!force) {
      const { data: cached } = await admin
        .from("daily_briefings")
        .select("content, generated_at")
        .eq("team_id", profile.team_id)
        .eq("briefing_date", today)
        .maybeSingle();
      if (cached) {
        const ageHours =
          (Date.now() - new Date(cached.generated_at).getTime()) / 3600_000;
        if (ageHours < STALE_HOURS) {
          return new Response(
            JSON.stringify({ content: cached.content, cached: true }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
      }
    }

    // Gather metrics
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString();

    const [jobs, quotes, invoices, expenses, autoRuns] = await Promise.all([
      admin.from("jobs").select("id,status,scheduled_date,created_at,total")
        .eq("team_id", profile.team_id),
      admin.from("quotes").select("id,status,total,created_at,updated_at")
        .eq("team_id", profile.team_id),
      admin.from("invoices").select("id,status,total,due_date,created_at,updated_at")
        .eq("team_id", profile.team_id),
      admin.from("expenses").select("id,amount,created_at")
        .eq("team_id", profile.team_id)
        .gte("created_at", sevenDaysAgo)
        .limit(200),
      admin.from("automation_runs").select("action,preview,success,ran_at")
        .eq("team_id", profile.team_id)
        .gte("ran_at", new Date(Date.now() - 86400_000).toISOString())
        .limit(50),
    ]);

    const j = jobs.data ?? [];
    const q = quotes.data ?? [];
    const inv = invoices.data ?? [];
    const exp = expenses.data ?? [];

    const todayDate = today;
    const overdueInvoices = inv.filter(
      (i: any) => i.status !== "paid" && i.due_date && i.due_date < todayDate,
    );
    const overdueAmount = overdueInvoices.reduce(
      (s: number, i: any) => s + (Number(i.total) || 0),
      0,
    );
    const pendingQuotes = q.filter((x: any) => x.status === "sent");
    const pendingQuoteAmount = pendingQuotes.reduce(
      (s: number, x: any) => s + (Number(x.total) || 0),
      0,
    );
    const activeJobs = j.filter((x: any) =>
      ["pending", "scheduled", "in_progress"].includes(x.status)
    );
    const jobsToday = j.filter(
      (x: any) => x.scheduled_date && x.scheduled_date.slice(0, 10) === todayDate,
    );
    const quotesSent7d = q.filter(
      (x: any) => x.status === "sent" && x.updated_at && x.updated_at >= sevenDaysAgo,
    ).length;
    const ar = autoRuns.data ?? [];
    const autoRunsLive = ar.filter((r: any) => !r.preview && r.success).length;
    const autoRunsPreview = ar.filter((r: any) => r.preview).length;
    const invoicesPaid7d = inv.filter(
      (x: any) =>
        x.status === "paid" && x.updated_at && x.updated_at >= sevenDaysAgo,
    ).length;

    const metrics = {
      active_jobs: activeJobs.length,
      jobs_today: jobsToday.length,
      pending_quotes: pendingQuotes.length,
      pending_quote_amount: Math.round(pendingQuoteAmount),
      overdue_invoices: overdueInvoices.length,
      overdue_amount: Math.round(overdueAmount),
      quotes_sent_7d: quotesSent7d,
      invoices_paid_7d: invoicesPaid7d,
      expenses_logged_7d: exp.length,
    };

    const firstName = profile.full_name?.split(" ")[0] ?? "boss";
    const currency = profile.currency || "EUR";

    const systemPrompt =
      `You are Revamo, an Irish foreman AI running a tradesperson's business. ` +
      `Generate a daily briefing for ${firstName} (${profile.trade_type ?? "tradesperson"} in ${profile.country ?? "IE"}). ` +
      `Be direct, plain-spoken, no corporate fluff. No emojis. Currency: ${currency}. ` +
      `Use Insight → Impact → Action structure for each priority. Keep each field tight. ` +
      `Reference real numbers from the metrics below. If nothing is happening, say so plainly.`;

    const userPrompt =
      `Today's metrics for the team:\n${JSON.stringify(metrics, null, 2)}\n\n` +
      `Return a briefing as JSON only matching this shape: ` +
      `{"headline": string, "priorities": [{"title": string, "impact": string, "action": string}] (1-3 items), ` +
      `"revenue_at_risk": string, "workforce": string, "overnight": string}.`;

    const aiRes = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "emit_briefing",
                description: "Return the structured briefing.",
                parameters: {
                  type: "object",
                  properties: {
                    headline: { type: "string" },
                    priorities: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          impact: { type: "string" },
                          action: { type: "string" },
                        },
                        required: ["title", "impact", "action"],
                        additionalProperties: false,
                      },
                    },
                    revenue_at_risk: { type: "string" },
                    workforce: { type: "string" },
                    overnight: { type: "string" },
                  },
                  required: [
                    "headline",
                    "priorities",
                    "revenue_at_risk",
                    "workforce",
                    "overnight",
                  ],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "emit_briefing" } },
        }),
      },
    );

    if (!aiRes.ok) {
      const text = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, text);
      if (aiRes.status === 429 || aiRes.status === 402) {
        return new Response(
          JSON.stringify({
            error:
              aiRes.status === 429
                ? "Rate limit reached, try again shortly."
                : "AI credits exhausted — top up your workspace.",
          }),
          {
            status: aiRes.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      throw new Error("AI gateway failed");
    }

    const aiJson = await aiRes.json();
    const tc = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    const args = tc?.function?.arguments
      ? JSON.parse(tc.function.arguments)
      : null;
    if (!args) throw new Error("AI returned no structured briefing");

    const content: BriefingContent = {
      ...args,
      metrics_snapshot: metrics,
    };

    await admin
      .from("daily_briefings")
      .upsert(
        {
          team_id: profile.team_id,
          briefing_date: today,
          content,
          generated_at: new Date().toISOString(),
        },
        { onConflict: "team_id,briefing_date" },
      );

    return new Response(JSON.stringify({ content, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-briefing error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
