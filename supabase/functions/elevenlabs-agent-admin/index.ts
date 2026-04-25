// Admin-only edge function to read (and optionally update) the ElevenLabs
// conversational agent configuration. Mirrors the auth + owner-check pattern
// used by toggle-george-voice/index.ts.
//
// POST body:
//   { "action": "get" }                       → returns full agent config
//   { "action": "update", "patch": { ... } }  → PATCHes the agent on ElevenLabs
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ELEVENLABS_AGENT_ID = "agent_2701kffwpjhvf4gvt2cxpsx6j3rb";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      return json({ error: "ELEVENLABS_API_KEY not configured" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    // Owner check — same pattern as toggle-george-voice
    const { data: orgId } = await userClient.rpc("get_user_org_id_v2");
    if (!orgId) return json({ error: "User not in an organisation" }, 403);

    const { data: isOwner, error: ownerErr } = await userClient.rpc("is_org_owner_v2", {
      _org_id: orgId,
    });
    if (ownerErr || !isOwner) {
      return json({ error: "Only org owners can manage the voice agent" }, 403);
    }

    let body: { action?: string; patch?: Record<string, unknown> } = {};
    try {
      body = await req.json();
    } catch {
      // empty body → default to "get"
    }
    const action = body.action ?? "get";

    if (action === "get") {
      const res = await fetch(
        `https://api.elevenlabs.io/v1/convai/agents/${ELEVENLABS_AGENT_ID}`,
        { headers: { "xi-api-key": ELEVENLABS_API_KEY } },
      );
      const text = await res.text();
      if (!res.ok) {
        return json({ error: `ElevenLabs ${res.status}`, detail: text.slice(0, 500) }, 502);
      }
      return new Response(text, {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update") {
      if (!body.patch || typeof body.patch !== "object") {
        return json({ error: "Missing 'patch' object" }, 400);
      }
      const res = await fetch(
        `https://api.elevenlabs.io/v1/convai/agents/${ELEVENLABS_AGENT_ID}`,
        {
          method: "PATCH",
          headers: {
            "xi-api-key": ELEVENLABS_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body.patch),
        },
      );
      const text = await res.text();
      if (!res.ok) {
        return json({ error: `ElevenLabs ${res.status}`, detail: text.slice(0, 500) }, 502);
      }
      console.log(`Agent ${ELEVENLABS_AGENT_ID} patched by user ${user.id}`);
      return new Response(text, {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (error: unknown) {
    console.error("elevenlabs-agent-admin error:", error);
    const msg = error instanceof Error ? error.message : "Internal error";
    return json({ error: msg }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
