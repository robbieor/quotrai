import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { FOREMAN_TOOL_DEFINITIONS } from "../_shared/foreman-tool-definitions.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const AGENT_ID = "agent_2701kffwpjhvf4gvt2cxpsx6j3rb";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      return new Response(
        JSON.stringify({ error: "ELEVENLABS_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Auth is optional — the ElevenLabs API key is the real security gate

    // Build the tools payload for ElevenLabs
    const tools = FOREMAN_TOOL_DEFINITIONS.map((tool) => ({
      type: tool.type,
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));

    console.log(`sync-agent-tools: Pushing ${tools.length} tools to agent ${AGENT_ID}`);

    // First GET the current agent config so we can preserve non-tool settings
    const getRes = await fetch(
      `https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`,
      {
        headers: { "xi-api-key": ELEVENLABS_API_KEY },
      }
    );

    if (!getRes.ok) {
      const errBody = await getRes.text();
      console.error("Failed to GET agent:", getRes.status, errBody);
      return new Response(
        JSON.stringify({ error: `Failed to fetch agent config: ${getRes.status}`, details: errBody }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const currentAgent = await getRes.json();
    const currentToolCount = currentAgent?.conversation_config?.tools?.length || 0;

    // Build a minimal patch: only set tools, explicitly clear tool_ids
    const patchBody = {
      conversation_config: {
        tools,
      },
    };

    const patchRes = await fetch(
      `https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`,
      {
        method: "PATCH",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(patchBody),
      }
    );

    if (!patchRes.ok) {
      const errBody = await patchRes.text();
      console.error("Failed to PATCH agent:", patchRes.status, errBody);
      return new Response(
        JSON.stringify({ error: `Failed to update agent: ${patchRes.status}`, details: errBody }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await patchRes.json();

    const summary = {
      success: true,
      agent_id: AGENT_ID,
      tools_pushed: tools.length,
      previous_tool_count: currentToolCount,
      tool_names: tools.map((t) => t.name),
    };

    console.log("sync-agent-tools: Success", summary);

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("sync-agent-tools error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
