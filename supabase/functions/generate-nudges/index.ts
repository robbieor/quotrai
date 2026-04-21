import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Get user from token
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const serviceClient = createClient(supabaseUrl, supabaseKey);

    // Get team ID
    const { data: teamId } = await userClient.rpc("get_user_team_id");
    if (!teamId) {
      return new Response(JSON.stringify({ nudges: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // Parallel data queries
    const [overdueRes, agingQuotesRes, todayJobsRes, profileRes, expensesRecentRes, expensesPriorRes, unreviewedRes, jobsOverBudgetRes] = await Promise.all([
      serviceClient
        .from("invoices")
        .select("id, total, due_date, customers(name)")
        .eq("team_id", teamId)
        .eq("status", "overdue")
        .order("due_date", { ascending: true })
        .limit(10),
      serviceClient
        .from("quotes")
        .select("id, total, created_at, customers(name)")
        .eq("team_id", teamId)
        .eq("status", "sent")
        .lt("created_at", new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: true })
        .limit(10),
      serviceClient
        .from("jobs")
        .select("id, title, scheduled_date, customers(name)")
        .eq("team_id", teamId)
        .gte("scheduled_date", today)
        .lt("scheduled_date", today + "T23:59:59")
        .limit(20),
      serviceClient
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single(),
    ]);

    const overdueInvoices = overdueRes.data || [];
    const agingQuotes = agingQuotesRes.data || [];
    const todayJobs = todayJobsRes.data || [];
    const firstName = profileRes.data?.full_name?.split(" ")[0] || "boss";

    // Build data snapshot for AI
    const dataSnapshot: string[] = [];

    if (overdueInvoices.length > 0) {
      const totalOverdue = overdueInvoices.reduce((s, i) => s + (i.total || 0), 0);
      const details = overdueInvoices.slice(0, 5).map((inv) => {
        const daysOverdue = Math.floor((now.getTime() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24));
        const custName = (inv as any).customers?.name || "Unknown";
        return `- ${custName}: €${Math.round(inv.total || 0).toLocaleString()} (${daysOverdue} days overdue)`;
      }).join("\n");
      dataSnapshot.push(`OVERDUE INVOICES (${overdueInvoices.length} total, €${Math.round(totalOverdue).toLocaleString()}):\n${details}`);
    }

    if (agingQuotes.length > 0) {
      const details = agingQuotes.slice(0, 5).map((q) => {
        const daysAging = Math.floor((now.getTime() - new Date(q.created_at).getTime()) / (1000 * 60 * 60 * 24));
        const custName = (q as any).customers?.name || "Unknown";
        return `- ${custName}: €${Math.round(q.total || 0).toLocaleString()} (sent ${daysAging} days ago)`;
      }).join("\n");
      dataSnapshot.push(`AGING QUOTES (${agingQuotes.length} sent but not accepted):\n${details}`);
    }

    if (todayJobs.length > 0) {
      dataSnapshot.push(`TODAY'S SCHEDULE: ${todayJobs.length} job${todayJobs.length > 1 ? "s" : ""} scheduled`);
    }

    // If no data to report, return empty
    if (dataSnapshot.length === 0) {
      return new Response(JSON.stringify({ nudges: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not set");
      return new Response(JSON.stringify({ nudges: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are George, an Irish foreman AI business partner. Generate 2-3 short, punchy nudges based on the business data below. Each nudge should:
- Reference specific names, amounts, and timeframes
- Be direct and practical — like a smart mate pointing something out
- Include an urgency level: "high" (money at risk), "medium" (needs attention soon), "low" (informational)
- Include a suggested action name from this list: get_overdue_invoices, get_todays_jobs, or null for general advice
- Include a short action_label (2-3 words) for the button

The user's first name is "${firstName}".

Return ONLY a valid JSON object with this exact structure:
{
  "nudges": [
    {
      "id": "nudge-1",
      "text": "Your nudge message here",
      "action": "get_overdue_invoices",
      "action_label": "Chase them",
      "urgency": "high"
    }
  ]
}`,
          },
          {
            role: "user",
            content: `Here's the current business snapshot:\n\n${dataSnapshot.join("\n\n")}`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI gateway error:", aiResponse.status);
      return new Response(JSON.stringify({ nudges: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from response
    let nudges: any[] = [];
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        nudges = parsed.nudges || [];
      }
    } catch (e) {
      console.error("Failed to parse nudges:", e);
    }

    return new Response(JSON.stringify({ nudges }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-nudges error:", e);
    return new Response(JSON.stringify({ error: "Internal error", nudges: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
