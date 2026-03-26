import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    const supabase = createClient(supabaseUrl, serviceKey);

    const { team_id, user_id, date } = await req.json();

    if (!team_id) {
      return new Response(JSON.stringify({ error: "team_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetDate = date || new Date().toISOString().split("T")[0];

    // Fetch today's data in parallel
    const [completedRes, invoicesRes, paymentsRes, tomorrowRes, hoursRes] = await Promise.all([
      supabase
        .from("jobs")
        .select("id, title, customer_id, customers(name)")
        .eq("team_id", team_id)
        .eq("status", "completed")
        .gte("updated_at", `${targetDate}T00:00:00`)
        .lte("updated_at", `${targetDate}T23:59:59`),
      supabase
        .from("invoices")
        .select("id, display_number, total, status")
        .eq("team_id", team_id)
        .gte("created_at", `${targetDate}T00:00:00`)
        .lte("created_at", `${targetDate}T23:59:59`),
      supabase
        .from("payments")
        .select("id, amount, payment_method")
        .eq("team_id", team_id)
        .eq("payment_date", targetDate),
      // Tomorrow
      supabase
        .from("jobs")
        .select("id, title, scheduled_time, customers(name)")
        .eq("team_id", team_id)
        .eq("scheduled_date", new Date(new Date(targetDate).getTime() + 86400000).toISOString().split("T")[0])
        .in("status", ["scheduled", "pending"])
        .order("scheduled_time"),
      // Time entries
      supabase
        .from("time_entries")
        .select("id, total_hours")
        .eq("team_id", team_id)
        .eq("entry_date", targetDate),
    ]);

    const completed = completedRes.data || [];
    const invoices = invoicesRes.data || [];
    const payments = paymentsRes.data || [];
    const tomorrow = tomorrowRes.data || [];
    const hours = hoursRes.data || [];

    const totalInvoiced = invoices.reduce((s: number, i: any) => s + (i.total || 0), 0);
    const totalPayments = payments.reduce((s: number, p: any) => s + (p.amount || 0), 0);
    const totalHours = hours.reduce((s: number, h: any) => s + (h.total_hours || 0), 0);

    const summary = {
      date: targetDate,
      jobs_completed: completed.length,
      completed_jobs: completed.map((j: any) => ({ title: j.title, customer: j.customers?.name })),
      invoices_sent: invoices.length,
      total_invoiced: totalInvoiced,
      payments_received: payments.length,
      total_payments: totalPayments,
      hours_logged: totalHours,
      tomorrow_jobs: tomorrow.length,
      tomorrow_schedule: tomorrow.map((j: any) => ({
        title: j.title,
        time: j.scheduled_time,
        customer: j.customers?.name,
      })),
    };

    // Generate AI narrative if API key available
    let narrative = "";
    if (lovableApiKey) {
      try {
        const prompt = `Generate a brief, friendly end-of-day summary for a tradesperson. Keep it under 100 words. Be encouraging.

Data:
- ${completed.length} jobs completed today
- ${invoices.length} invoices sent (total: €${totalInvoiced.toFixed(2)})
- ${payments.length} payments received (total: €${totalPayments.toFixed(2)})
- ${totalHours.toFixed(1)} hours logged
- ${tomorrow.length} jobs scheduled tomorrow

${tomorrow.length > 0 ? `Tomorrow's first job: ${tomorrow[0].title} at ${tomorrow[0].scheduled_time || "TBC"}` : "No jobs scheduled tomorrow."}`;

        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${lovableApiKey}`,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              { role: "system", content: "You are a friendly AI assistant for tradespeople. Write brief daily summaries." },
              { role: "user", content: prompt },
            ],
            temperature: 0.7,
            max_tokens: 200,
          }),
        });

        if (aiRes.ok) {
          const aiData = await aiRes.json();
          narrative = aiData.choices?.[0]?.message?.content || "";
        }
      } catch (err) {
        console.error("AI narrative failed:", err);
      }
    }

    // Create notification
    if (user_id) {
      await supabase.from("notifications").insert({
        user_id,
        team_id,
        title: "Today's Wrap-Up",
        message: narrative || `${completed.length} jobs done, ${invoices.length} invoices sent, ${payments.length} payments received.`,
        type: "end_of_day_summary",
      }).catch(() => {});
    }

    return new Response(
      JSON.stringify({ success: true, summary, narrative }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("end-of-day-summary error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
