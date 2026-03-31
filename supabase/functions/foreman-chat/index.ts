import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Authenticate user & fetch trade type
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    const authHeader = req.headers.get("Authorization");
    let userTradeType: string | null = null;
    let userName = "there";
    let userCurrency = "EUR";

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseClient.auth.getUser(token);
      if (!data.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Fetch profile for trade context
      if (serviceKey) {
        const svc = createClient(supabaseUrl, serviceKey);
        const { data: profile } = await svc.from("profiles").select("trade_type, full_name, currency").eq("id", data.user.id).maybeSingle();
        if (profile) {
          userTradeType = profile.trade_type;
          userName = profile.full_name || "there";
        }
      }
    }

    const now = new Date();
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    // Trade-specific context injection
    const tradeContextMap: Record<string, string> = {
      "Electrician": "TRADE: Electrician. Standards: BS 7671, IS 10101, RECI (Ireland), NICEIC (UK), Safe Electric, Part P. Jobs: CU upgrades, rewires, EV chargers, PAT testing, fire alarms, EICRs. Rates: €40-65/hr domestic, €55-85/hr commercial.",
      "Plumber": "TRADE: Plumber. Standards: Gas Safe (UK), RGII (Ireland), Water Regs, Part G/H. Jobs: Boiler installs, cylinder swaps, bathroom fits, power flushing, underfloor heating. Rates: €45-70/hr.",
      "HVAC Technician": "TRADE: HVAC. Standards: F-Gas Regulation, BER (Ireland), EPC (UK), MCS. Jobs: Heat pumps, AC installs, MVHR, ductwork, refrigeration. Rates: €50-80/hr.",
      "Carpenter": "TRADE: Carpenter. Jobs: First/second fix, kitchens, staircases, timber frame, decking, fire doors. Rates: Day rate €250-400.",
      "Painter & Decorator": "TRADE: Painter & Decorator. Jobs: Interior/exterior painting, wallpapering, spraying, commercial decoration. Rates: Day rate €200-350.",
      "Roofer": "TRADE: Roofer. Standards: BS 5534. Jobs: Re-roofing, flat roofs (EPDM/GRP), guttering, lead work, skylights. Rates: Full re-roof €6,000-12,000.",
      "Builder / General Contractor": "TRADE: General Builder. Jobs: Extensions, renovations, conversions, new builds, groundworks. Rates: Extension €1,500-2,500/m².",
      "Tiler": "TRADE: Tiler. Jobs: Wall/floor tiling, waterproofing, natural stone, large format. Rates: €40-80/m² supply + fit.",
      "Solar": "TRADE: Solar. Standards: SEAI grants (Ireland), MCS (UK), DNO applications. Jobs: PV panels, battery storage, inverters. Rates: 3kW system €4,000-6,000.",
    };
    const tradeContext = userTradeType ? (tradeContextMap[userTradeType] || `TRADE: ${userTradeType}.`) : "";

    const systemPrompt = `You are Foreman AI, the intelligent operations assistant for Foreman — an AI operating system for trade businesses in Ireland and the UK.

Current date: ${now.toISOString().split("T")[0]} (${dayNames[now.getDay()]})
User: ${userName}
${tradeContext}

Guidelines:
- Be concise, professional, and helpful
- Use trade terminology naturally — reference standards, regs, and certifications relevant to the user's trade
- When asked about creating quotes/invoices, explain the process and guide the user
- For trade advice, pricing, or compliance questions, give specific actionable answers grounded in your trade expertise
- Currency is EUR (€) by default unless user specifies otherwise
- VAT rate in Ireland is 23% for most services
- Be proactive with suggestions and best practices
- Keep responses focused and actionable`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(
        JSON.stringify({ error: "AI service temporarily unavailable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("foreman-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
