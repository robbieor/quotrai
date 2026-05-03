import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ELEVENLABS_AGENT_ID = "agent_2701kffwpjhvf4gvt2cxpsx6j3rb";

type CheckResult = {
  ok: boolean;
  status?: number;
  detail?: string;
  data?: Record<string, unknown>;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    const result: Record<string, CheckResult | string | boolean> = {
      apiKeyPresent: !!apiKey,
      agentId: ELEVENLABS_AGENT_ID,
    };

    if (!apiKey) {
      return json({
        ok: false,
        verdict: "missing_api_key",
        message: "ELEVENLABS_API_KEY is not set in project secrets.",
        ...result,
      });
    }

    const headers = { "xi-api-key": apiKey };

    const [userRes, agentRes, subRes] = await Promise.all([
      safeFetch("https://api.elevenlabs.io/v1/user", { headers }),
      safeFetch(`https://api.elevenlabs.io/v1/convai/agents/${ELEVENLABS_AGENT_ID}`, { headers }),
      safeFetch("https://api.elevenlabs.io/v1/user/subscription", { headers }),
    ]);

    result.userCheck = userRes;
    result.agentCheck = agentRes;
    result.subscriptionCheck = subRes;

    let verdict = "ok";
    let message = "All checks passed.";

    if (!userRes.ok) {
      verdict = userRes.status === 401 ? "invalid_api_key" : "user_check_failed";
      message =
        userRes.status === 401
          ? "ElevenLabs rejected the API key (invalid or revoked)."
          : `User check failed (${userRes.status}).`;
    } else if (!agentRes.ok) {
      verdict =
        agentRes.status === 404
          ? "agent_not_found"
          : agentRes.status === 401 || agentRes.status === 403
            ? "missing_convai_scope"
            : "agent_check_failed";
      message =
        agentRes.status === 404
          ? `Agent ${ELEVENLABS_AGENT_ID} not found in this ElevenLabs workspace.`
          : agentRes.status === 401 || agentRes.status === 403
            ? "API key is missing the 'Conversational AI: Write' scope."
            : `Agent check failed (${agentRes.status}).`;
    } else if (subRes.ok && subRes.data) {
      const d = subRes.data as Record<string, unknown>;
      const used = Number(d.character_count ?? 0);
      const limit = Number(d.character_limit ?? 0);
      if (limit > 0 && used >= limit) {
        verdict = "credits_exhausted";
        message = "ElevenLabs character/credit limit reached for this billing period.";
      }
    }

    return json({ ok: verdict === "ok", verdict, message, ...result });
  } catch (e) {
    console.error("voice-preflight error:", e);
    return json({ ok: false, verdict: "internal_error", message: String(e).slice(0, 200) }, 500);
  }
});

async function safeFetch(url: string, init: RequestInit): Promise<CheckResult> {
  try {
    const res = await fetch(url, init);
    let data: Record<string, unknown> | undefined;
    let detail: string | undefined;
    const text = await res.text();
    try {
      data = JSON.parse(text);
    } catch {
      detail = text.slice(0, 200);
    }
    return { ok: res.ok, status: res.status, data, detail };
  } catch (e) {
    return { ok: false, detail: String(e).slice(0, 200) };
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
