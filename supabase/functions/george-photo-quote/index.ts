import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: "AI not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user profile and team
    const { data: profile } = await serviceSupabase
      .from("profiles")
      .select("team_id, trade_type, currency")
      .eq("id", user.id)
      .single();

    if (!profile?.team_id) {
      return new Response(
        JSON.stringify({ error: "User not in a team" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { image_url, additional_context } = await req.json();

    if (!image_url) {
      return new Response(
        JSON.stringify({ error: "Image URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch user's templates with items for pricing context
    const { data: templates } = await serviceSupabase
      .from("templates")
      .select("id, name, category, description, estimated_duration, labour_rate_default")
      .eq("team_id", profile.team_id)
      .eq("is_active", true)
      .limit(50);

    const { data: templateItems } = await serviceSupabase
      .from("template_items")
      .select("template_id, description, quantity, unit_price, unit, item_type, is_material")
      .in("template_id", (templates || []).map((t) => t.id));

    // Build template context for the AI
    const templateContext = (templates || []).map((t) => {
      const items = (templateItems || []).filter((i) => i.template_id === t.id);
      const totalPrice = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
      return {
        name: t.name,
        category: t.category,
        description: t.description,
        estimated_duration: t.estimated_duration,
        labour_rate: t.labour_rate_default,
        items: items.map((i) => ({
          description: i.description,
          quantity: i.quantity,
          unit_price: i.unit_price,
          unit: i.unit,
          type: i.item_type,
          is_material: i.is_material,
        })),
        total_price: totalPrice,
      };
    });

    const currency = profile.currency || "EUR";
    const tradeType = profile.trade_type || "general";

    // Call Gemini vision to analyse the photo
    const systemPrompt = `You are an expert ${tradeType} trade estimator. You analyse photos of job sites and identify what work needs to be done, then generate a quote with line items and pricing.

You have access to the user's saved templates and pricing:
${JSON.stringify(templateContext, null, 2)}

Currency: ${currency}

INSTRUCTIONS:
1. Analyse the photo to identify the type of work needed
2. Match it to the most relevant template(s) from the user's saved templates
3. If no template matches, use your trade knowledge to estimate line items and fair pricing for the ${tradeType} trade
4. Generate a structured quote suggestion

IMPORTANT:
- Use the user's template pricing when a match exists
- Be specific about materials and labour
- Include realistic quantities
- The user will review and adjust before sending

Respond with a JSON object using this EXACT structure (no markdown, just raw JSON):
{
  "job_type": "Short description of the job type identified",
  "confidence": "high" | "medium" | "low",
  "matched_template": "Name of matched template or null",
  "description": "Brief description of what you see and the work needed",
  "line_items": [
    {
      "description": "Line item description",
      "quantity": 1,
      "unit_price": 100,
      "is_material": false
    }
  ],
  "subtotal": 500,
  "estimated_duration_hours": 4,
  "notes": "Any additional notes or assumptions",
  "follow_up_questions": ["Question about measurements?", "Question about materials?"]
}`;

    console.log("george-photo-quote: Sending image to Gemini for analysis");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: image_url },
              },
              {
                type: "text",
                text: additional_context
                  ? `Here's a photo of the job. Additional context from the tradesperson: "${additional_context}". Analyse this and generate a quote.`
                  : "Here's a photo of the job. Analyse this and generate a quote suggestion with line items.",
              },
            ],
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI vision request failed:", errorText);

      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error("AI vision analysis failed");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    console.log("george-photo-quote: Raw AI response:", content);

    // Parse the JSON response (strip markdown code fences if present)
    let quoteData;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      quoteData = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("Failed to parse AI quote response:", parseErr);
      return new Response(
        JSON.stringify({
          error: "Could not parse the analysis. Please try again with a clearer photo.",
          raw_response: content,
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        quote_suggestion: quoteData,
        currency,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("george-photo-quote error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
