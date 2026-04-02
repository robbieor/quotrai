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

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const serviceClient = createClient(supabaseUrl, supabaseKey);
    const { data: teamId } = await userClient.rpc("get_user_team_id");
    if (!teamId) {
      return new Response(JSON.stringify({ analysis: null }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const now = new Date();
    const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000).toISOString();

    // Parallel data gathering — 4 weeks of business data
    const [
      invoicesRes,
      quotesRes,
      jobsRes,
      expensesRes,
      paymentsRes,
      conversationsRes,
      profileRes,
    ] = await Promise.all([
      serviceClient
        .from("invoices")
        .select("id, total, status, due_date, issue_date, customer_id, customers(name)")
        .eq("team_id", teamId)
        .gte("issue_date", fourWeeksAgo.split("T")[0])
        .order("issue_date", { ascending: false })
        .limit(500),
      serviceClient
        .from("quotes")
        .select("id, total, status, created_at, customer_id, customers(name), quote_items(description, unit_price, quantity)")
        .eq("team_id", teamId)
        .gte("created_at", fourWeeksAgo)
        .order("created_at", { ascending: false })
        .limit(500),
      serviceClient
        .from("jobs")
        .select("id, title, status, scheduled_date, estimated_value, customer_id, customers(name)")
        .eq("team_id", teamId)
        .gte("created_at", fourWeeksAgo)
        .order("scheduled_date", { ascending: false })
        .limit(500),
      serviceClient
        .from("expenses")
        .select("id, amount, category, expense_date, description, job_id")
        .eq("team_id", teamId)
        .gte("expense_date", fourWeeksAgo.split("T")[0])
        .limit(500),
      serviceClient
        .from("invoice_payments")
        .select("id, amount, payment_date, invoice_id")
        .gte("payment_date", fourWeeksAgo.split("T")[0])
        .limit(500),
      serviceClient
        .from("ai_conversations")
        .select("content, role, created_at")
        .eq("user_id", user.id)
        .gte("created_at", fourWeeksAgo)
        .order("created_at", { ascending: false })
        .limit(100),
      serviceClient
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single(),
    ]);

    const invoices = invoicesRes.data || [];
    const quotes = quotesRes.data || [];
    const jobs = jobsRes.data || [];
    const expenses = expensesRes.data || [];
    const payments = paymentsRes.data || [];
    const conversations = conversationsRes.data || [];
    const firstName = profileRes.data?.full_name?.split(" ")[0] || "boss";

    // Build comprehensive data snapshot
    const sections: string[] = [];

    // 1. Pricing patterns
    if (quotes.length > 0) {
      const quotesByType: Record<string, number[]> = {};
      quotes.forEach((q: any) => {
        q.quote_items?.forEach((item: any) => {
          const desc = (item.description || "General").toLowerCase().trim();
          if (!quotesByType[desc]) quotesByType[desc] = [];
          quotesByType[desc].push(item.unit_price || 0);
        });
      });
      const pricingLines = Object.entries(quotesByType)
        .filter(([_, prices]) => prices.length >= 2)
        .map(([type, prices]) => {
          const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
          const min = Math.min(...prices);
          const max = Math.max(...prices);
          return `- "${type}": avg €${avg.toFixed(0)}, range €${min.toFixed(0)}–€${max.toFixed(0)} (${prices.length} instances)`;
        });
      if (pricingLines.length > 0) {
        sections.push(`PRICING DATA (${quotes.length} quotes, 4 weeks):\n${pricingLines.join("\n")}`);
      }
      const avgQuoteTotal = quotes.reduce((s, q) => s + (q.total || 0), 0) / quotes.length;
      sections.push(`Average quote total: €${avgQuoteTotal.toFixed(0)}`);
    }

    // 2. Cash collection
    if (invoices.length > 0) {
      const paid = invoices.filter((i) => i.status === "paid");
      const overdue = invoices.filter((i) => i.status === "overdue");
      const pending = invoices.filter((i) => i.status === "pending");

      // Days to payment
      const paymentDays: number[] = [];
      paid.forEach((inv) => {
        const matchedPayment = payments.find((p: any) => p.invoice_id === inv.id);
        if (matchedPayment) {
          const issued = new Date(inv.issue_date).getTime();
          const paidAt = new Date(matchedPayment.payment_date).getTime();
          paymentDays.push(Math.floor((paidAt - issued) / (1000 * 60 * 60 * 24)));
        }
      });
      const avgDays = paymentDays.length > 0 ? Math.round(paymentDays.reduce((a, b) => a + b, 0) / paymentDays.length) : null;

      // Worst payers
      const customerPaymentMap: Record<string, { name: string; overdue: number; total: number }> = {};
      overdue.forEach((inv: any) => {
        const cid = inv.customer_id;
        const name = inv.customers?.name || "Unknown";
        if (!customerPaymentMap[cid]) customerPaymentMap[cid] = { name, overdue: 0, total: 0 };
        customerPaymentMap[cid].overdue += inv.total || 0;
        customerPaymentMap[cid].total += 1;
      });
      const worstPayers = Object.values(customerPaymentMap).sort((a, b) => b.overdue - a.overdue).slice(0, 5);

      let cashSection = `CASH COLLECTION (4 weeks):\n`;
      cashSection += `- Total invoiced: €${invoices.reduce((s, i) => s + (i.total || 0), 0).toFixed(0)}\n`;
      cashSection += `- Paid: ${paid.length} (€${paid.reduce((s, i) => s + (i.total || 0), 0).toFixed(0)})\n`;
      cashSection += `- Pending: ${pending.length} (€${pending.reduce((s, i) => s + (i.total || 0), 0).toFixed(0)})\n`;
      cashSection += `- Overdue: ${overdue.length} (€${overdue.reduce((s, i) => s + (i.total || 0), 0).toFixed(0)})\n`;
      if (avgDays !== null) cashSection += `- Average days to payment: ${avgDays}\n`;
      if (worstPayers.length > 0) {
        cashSection += `- Slowest payers:\n` + worstPayers.map((p) => `  • ${p.name}: €${p.overdue.toFixed(0)} overdue (${p.total} invoices)`).join("\n");
      }
      sections.push(cashSection);
    }

    // 3. Scheduling efficiency
    if (jobs.length > 0) {
      const scheduled = jobs.filter((j) => j.scheduled_date);
      const dateMap: Record<string, number> = {};
      scheduled.forEach((j) => {
        const d = (j.scheduled_date || "").split("T")[0];
        if (d) dateMap[d] = (dateMap[d] || 0) + 1;
      });
      const dailyCounts = Object.values(dateMap);
      const avgPerDay = dailyCounts.length > 0 ? (dailyCounts.reduce((a, b) => a + b, 0) / dailyCounts.length).toFixed(1) : "0";
      const maxDay = dailyCounts.length > 0 ? Math.max(...dailyCounts) : 0;
      const emptyDays = 20 - Object.keys(dateMap).length; // approx workdays in 4 weeks

      let schedSection = `SCHEDULING (4 weeks, ${jobs.length} jobs):\n`;
      schedSection += `- Average jobs/day: ${avgPerDay}\n`;
      schedSection += `- Busiest day: ${maxDay} jobs\n`;
      schedSection += `- Days with no jobs: ~${Math.max(0, emptyDays)}\n`;
      schedSection += `- Status breakdown: ${jobs.filter((j) => j.status === "completed").length} completed, ${jobs.filter((j) => j.status === "cancelled").length} cancelled, ${jobs.filter((j) => j.status === "pending").length} pending`;
      sections.push(schedSection);
    }

    // 4. Quote conversion
    if (quotes.length > 0) {
      const accepted = quotes.filter((q) => q.status === "accepted");
      const declined = quotes.filter((q) => q.status === "declined");
      const sent = quotes.filter((q) => q.status === "sent");
      const draft = quotes.filter((q) => q.status === "draft");
      const winRate = quotes.length > 0 ? ((accepted.length / quotes.length) * 100).toFixed(0) : "0";

      // Average response time for accepted
      const responseTimes: number[] = [];
      accepted.forEach((q) => {
        const created = new Date(q.created_at).getTime();
        const daysSince = Math.floor((now.getTime() - created) / (1000 * 60 * 60 * 24));
        responseTimes.push(daysSince);
      });

      let quoteSection = `QUOTE CONVERSION (4 weeks, ${quotes.length} quotes):\n`;
      quoteSection += `- Win rate: ${winRate}% (${accepted.length} accepted, ${declined.length} declined)\n`;
      quoteSection += `- Still pending: ${sent.length} sent, ${draft.length} draft\n`;
      quoteSection += `- Total quoted value: €${quotes.reduce((s, q) => s + (q.total || 0), 0).toFixed(0)}\n`;
      quoteSection += `- Accepted value: €${accepted.reduce((s, q) => s + (q.total || 0), 0).toFixed(0)}`;
      sections.push(quoteSection);
    }

    // 5. Expenses
    if (expenses.length > 0) {
      const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
      const byCat: Record<string, number> = {};
      expenses.forEach((e) => {
        byCat[e.category] = (byCat[e.category] || 0) + (e.amount || 0);
      });
      const catLines = Object.entries(byCat)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([cat, amt]) => `- ${cat}: €${amt.toFixed(0)}`);
      sections.push(`EXPENSES (4 weeks, €${totalExpenses.toFixed(0)} total):\n${catLines.join("\n")}`);
    }

    // 6. Conversation themes (last 100 user messages)
    const userMessages = conversations.filter((c) => c.role === "user").map((c) => c.content).slice(0, 30);
    if (userMessages.length > 0) {
      sections.push(`RECENT USER QUERIES (sample of ${userMessages.length}):\n${userMessages.map((m) => `- "${m.slice(0, 100)}"`).join("\n")}`);
    }

    if (sections.length === 0) {
      return new Response(JSON.stringify({ analysis: null }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Call Lovable AI for structured analysis
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const analysisPrompt = `Analyse this tradesperson's business data from the past 4 weeks. Their name is ${firstName}.

Identify:
1. **Pricing patterns** — are they consistent? Are certain job types underpriced?
2. **Cash collection patterns** — average days to payment, worst clients
3. **Scheduling efficiency** — gaps, overloads, travel time issues
4. **Quote conversion** — win rate, average response time, common objections
5. **Any recurring problems or complaints** mentioned in conversations

Return a structured analysis with SPECIFIC recommendations referencing real numbers and names from the data.

Be direct and practical — like a smart business partner reviewing the books. Don't sugarcoat.`;

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
            content: `You are George, an Irish foreman AI business partner. You're reviewing the weekly business performance for a tradesperson. Be specific, reference actual data, and give actionable advice. Format your response using markdown with clear sections and bullet points. Keep it under 600 words.`,
          },
          {
            role: "user",
            content: `${analysisPrompt}\n\nHere's the data:\n\n${sections.join("\n\n")}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "weekly_analysis",
              description: "Return structured weekly business analysis",
              parameters: {
                type: "object",
                properties: {
                  summary: { type: "string", description: "One-line overall health assessment" },
                  health_score: { type: "number", description: "Business health score 1-10" },
                  sections: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        status: { type: "string", enum: ["good", "warning", "critical"] },
                        insight: { type: "string" },
                        recommendation: { type: "string" },
                      },
                      required: ["title", "status", "insight", "recommendation"],
                    },
                  },
                  top_actions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        action: { type: "string" },
                        impact: { type: "string" },
                        urgency: { type: "string", enum: ["high", "medium", "low"] },
                      },
                      required: ["action", "impact", "urgency"],
                    },
                  },
                },
                required: ["summary", "health_score", "sections", "top_actions"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "weekly_analysis" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    let analysis = null;
    if (toolCall?.function?.arguments) {
      try {
        analysis = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        console.error("Failed to parse analysis:", e);
      }
    }

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("weekly-analysis error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
