import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Tone = "professional" | "friendly" | "firm" | "apologetic";
type Context =
  | "quote_followup"
  | "overdue_chase"
  | "new_lead_reply"
  | "customer_note"
  | "job_description"
  | "generic";

const TONE_GUIDANCE: Record<Tone, string> = {
  professional: "Clear, polished, business-confident. No slang.",
  friendly: "Warm, conversational, approachable. Still concise.",
  firm: "Direct and assertive without being rude. Make next steps unmissable.",
  apologetic: "Acknowledge the issue, take responsibility, propose a clear fix.",
};

const CONTEXT_GUIDANCE: Record<Context, string> = {
  quote_followup: "Following up on a quote that hasn't been accepted yet. End with a clear ask.",
  overdue_chase: "Chasing an overdue invoice. Polite but specific about amount/date.",
  new_lead_reply: "Responding to a new enquiry. Confirm you can help, suggest a next step (visit/call).",
  customer_note: "Internal note about a customer. Keep facts, drop fluff.",
  job_description: "Description of a job to be done. Crisp scope, no marketing copy.",
  generic: "Improve clarity and tone, preserve all factual content.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth gate
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supa = createClient(supabaseUrl, supabaseAnonKey);
    const { data: userData } = await supa.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const text: string = (body.text ?? "").toString().trim();
    const tone: Tone = (body.tone ?? "professional") as Tone;
    const context: Context = (body.context ?? "generic") as Context;

    if (!text) {
      return new Response(JSON.stringify({ error: "Missing text" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (text.length > 4000) {
      return new Response(JSON.stringify({ error: "Text too long (max 4000 chars)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!TONE_GUIDANCE[tone]) {
      return new Response(JSON.stringify({ error: "Invalid tone" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!CONTEXT_GUIDANCE[context]) {
      return new Response(JSON.stringify({ error: "Invalid context" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are Foreman's Rewrite assistant — a no-nonsense Irish foreman polishing trade business communications.

RULES:
- Preserve every fact, number, date, name, and amount from the original. Never invent details.
- Match the requested tone: ${TONE_GUIDANCE[tone]}
- Match the requested context: ${CONTEXT_GUIDANCE[context]}
- Keep length similar or slightly shorter than the original. Trim filler.
- No corporate phrasing ("kindly", "please be advised", "as per"). No emojis.
- Output ONLY the rewritten text. No preamble, no explanation, no quotes around it.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Add credits to continue." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(JSON.stringify({ error: "Rewrite service unavailable" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const rewritten: string = (data.choices?.[0]?.message?.content ?? "").trim();
    if (!rewritten) {
      return new Response(JSON.stringify({ error: "Empty rewrite" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ rewritten }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("foreman-rewrite error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
