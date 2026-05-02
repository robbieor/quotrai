import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { FOREMAN_TOOL_DEFINITIONS, AGENT_APP_CONTEXT, AGENT_FIRST_MESSAGE, TOOLS_VERSION } from "../_shared/foreman-tool-definitions.ts";

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

    const tools = FOREMAN_TOOL_DEFINITIONS.map((tool) => ({
      type: tool.type,
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));

    console.log(`sync-agent-tools v${TOOLS_VERSION}: pushing ${tools.length} tools + agent context to ${AGENT_ID}`);

    // Fetch current agent so we can preserve unrelated config
    const getRes = await fetch(
      `https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`,
      { headers: { "xi-api-key": ELEVENLABS_API_KEY } }
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
    const currentToolCount = currentAgent?.conversation_config?.agent?.prompt?.tools?.length
      ?? currentAgent?.conversation_config?.tools?.length
      ?? 0;

    // ElevenLabs migrated agents to a Tools library: agents now reference tools
    // by `tool_ids` (pointers to documents in the library). Stale ids on this
    // agent point to deleted tool documents, causing 404 "document_not_found"
    // on every PATCH. We clear `tool_ids` and send our definitions inline via
    // `prompt.tools` (the legacy-but-still-supported field).
    const patchBody = {
      conversation_config: {
        agent: {
          first_message: AGENT_FIRST_MESSAGE,
          prompt: {
            prompt: AGENT_APP_CONTEXT,
            tools,
            tool_ids: [],
          },
        },
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

    const summary = {
      success: true,
      version: TOOLS_VERSION,
      agent_id: AGENT_ID,
      tools_pushed: tools.length,
      previous_tool_count: currentToolCount,
      prompt_pushed: true,
      tool_names: tools.map((t) => t.name),
    };

    console.log("sync-agent-tools success", summary);

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
