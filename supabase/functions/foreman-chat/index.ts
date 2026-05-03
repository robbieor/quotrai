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
          userCurrency = profile.currency || "EUR";
        }
      }
    }

    const now = new Date();
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    // Currency + region context
    const currSymbols: Record<string, string> = { EUR: "€", GBP: "£", USD: "$", AUD: "A$", CAD: "C$", NZD: "NZ$" };
    const cs = currSymbols[userCurrency] || userCurrency + " ";
    const regionMap: Record<string, string> = {
      EUR: "Ireland. VAT: 23%/13.5%/9%/0%.",
      GBP: "UK. VAT: 20%.",
      USD: "US. Sales tax varies by state.",
      AUD: "Australia. GST: 10%.",
      CAD: "Canada. GST/HST varies by province.",
      NZD: "New Zealand. GST: 15%.",
    };
    const region = regionMap[userCurrency] || `Currency: ${userCurrency}.`;

    // Trade-specific context injection
    const tradeContextMap: Record<string, string> = {
      "Electrician": `TRADE: Electrician. Standards: BS 7671, IS 10101, RECI (IE), NICEIC (UK), NEC (US), AS/NZS 3000 (AU/NZ). Jobs: CU upgrades, rewires, EV chargers, PAT testing, fire alarms, EICRs. Rates: ${cs}40-65/hr domestic.`,
      "Plumber": `TRADE: Plumber. Standards: Gas Safe (UK), RGII (IE), UPC/IPC (US), AS/NZS 3500 (AU/NZ). Jobs: Boiler installs, bathroom fits, power flushing, underfloor heating. Rates: ${cs}45-70/hr.`,
      "HVAC Technician": `TRADE: HVAC. Standards: F-Gas (EU), EPA 608 (US), ARCtick (AU). Jobs: Heat pumps, AC, MVHR, ductwork, refrigeration. Rates: ${cs}50-80/hr.`,
      "Carpenter": `TRADE: Carpenter. Jobs: First/second fix, kitchens, staircases, timber frame, decking, fire doors. Rates: Day rate ${cs}250-400.`,
      "Painter & Decorator": `TRADE: Painter & Decorator. Jobs: Interior/exterior painting, wallpapering, spraying, commercial decoration. Rates: Day rate ${cs}200-350.`,
      "Roofer": `TRADE: Roofer. Standards: BS 5534, NRCA (US). Jobs: Re-roofing, flat roofs (EPDM/GRP/TPO), guttering, lead work. Rates: Full re-roof ${cs}6,000-12,000.`,
      "Landscaper": `TRADE: Landscaper. Jobs: Garden design, paving, fencing, turfing, drainage, artificial grass, irrigation. Rates: Patio ${cs}60-120/m².`,
      "Builder / General Contractor": `TRADE: General Builder. Jobs: Extensions, renovations, conversions, new builds, groundworks. Rates: Extension ${cs}1,500-2,500/m².`,
      "Locksmith": `TRADE: Locksmith. Jobs: Lock upgrades, emergency access, master key, access control, smart locks, BS 3621. Rates: Emergency ${cs}80-150.`,
      "Handyman": `TRADE: Handyman. Jobs: Multi-trade small works, shelving, flat-pack, minor plumbing/electrical, door hanging. Rates: ${cs}35-55/hr.`,
      "Cleaning Services": `TRADE: Cleaning. Jobs: Deep cleans, end-of-tenancy, carpet, window, pressure washing, office cleaning. Rates: ${cs}25-45/hr.`,
      "Pest Control": `TRADE: Pest Control. Jobs: Rodent control, insect treatment, bird proofing, fumigation. BPCA/IPCA standards. Rates: Rodent treatment ${cs}150-300.`,
      "Pool & Spa": `TRADE: Pool & Spa. Jobs: Pool builds, liner replacement, pump/filter, chemical balancing, heating. Rates: Maintenance ${cs}100-200/month.`,
      "Pressure Washing": `TRADE: Pressure Washing. Jobs: Driveways, patios, decking, render, roof cleaning, graffiti. Rates: Driveway ${cs}150-400.`,
      "Fencing": `TRADE: Fencing. Jobs: Timber fencing, metal railings, colorbond, post and rail, automated gates. Rates: Panel fencing ${cs}60-100/m.`,
      "Appliance Repair": `TRADE: Appliance Repair. Jobs: Washing machines, dishwashers, ovens, fridges, dryers, commercial catering. Rates: Callout ${cs}50-80.`,
      "Auto Detailing": `TRADE: Auto Detailing. Jobs: Interior/exterior detailing, paint correction, ceramic coating, PPF. Rates: Full detail ${cs}150-400.`,
      "Garage Door Services": `TRADE: Garage Doors. Jobs: Sectional, roller, automation, spring replacement, motor installs. Rates: New door ${cs}800-2,500.`,
      "Tree Services": `TRADE: Tree Services. Jobs: Felling, pruning, stump grinding, hedge trimming, site clearance, TPO. Rates: Felling ${cs}300-2,000+.`,
      "Restoration": `TRADE: Restoration. Jobs: Fire/flood damage, damp treatment, structural repair, heritage, mould remediation. Rates: Damp treatment ${cs}500-3,000.`,
      "Solar": `TRADE: Solar. Standards: SEAI (IE), MCS (UK), CEC (AU), NEC 690 (US). Jobs: PV panels, battery storage, inverters. Rates: 3kW system ${cs}4,000-6,000.`,
      "Flooring": `TRADE: Flooring. Jobs: Hardwood, engineered wood, LVT, laminate, carpet, sanding/refinishing. Rates: LVT ${cs}40-70/m² fitted.`,
      "Tiler": `TRADE: Tiler. Jobs: Wall/floor tiling, waterproofing, natural stone, large format, wet rooms. Rates: ${cs}40-80/m² supply + fit.`,
      "Property Maintenance": `TRADE: Property Maintenance. Jobs: Landlord services, planned maintenance, reactive repairs, void turnarounds. Rates: ${cs}35-55/hr.`,
      "Concrete & Masonry": `TRADE: Concrete & Masonry. Jobs: Foundations, slabs, block laying, brickwork, rendering, polished concrete. Rates: Block laying ${cs}40-60/m².`,
      "Window & Door Installation": `TRADE: Windows & Doors. Jobs: UPVC, aluminium, timber, composite doors, bi-folds, roof windows, FENSA (UK), SEAI grants (IE). Rates: Window ${cs}400-800 each.`,
    };
    const tradeContext = userTradeType ? (tradeContextMap[userTradeType] || `TRADE: ${userTradeType}.`) : "";

    const systemPrompt = `You are Revamo AI, the intelligent operations assistant for Revamo — an AI operating system for trade businesses.

Region: ${region}
Current date: ${now.toISOString().split("T")[0]} (${dayNames[now.getDay()]})
User: ${userName}
Currency: ${userCurrency} (${cs})
${tradeContext}

Guidelines:
- Be concise, professional, and helpful
- Use trade terminology naturally — reference standards, regs, and certifications relevant to the user's trade and region
- When asked about creating quotes/invoices, explain the process and guide the user
- For trade advice, pricing, or compliance questions, give specific actionable answers grounded in your trade expertise
- Use the user's currency (${cs}) for ALL monetary values
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
