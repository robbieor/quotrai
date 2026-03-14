import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ELEVENLABS_AGENT_ID = "agent_2701kffwpjhvf4gvt2cxpsx6j3rb";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY") || Deno.env.get("ELEVEN_LABS_API");

    if (!ELEVENLABS_API_KEY) {
      console.error("ElevenLabs API key not configured");
      // Return agent ID for public agent fallback
      return new Response(
        JSON.stringify({ 
          agentId: ELEVENLABS_AGENT_ID,
          usePublicAgent: true 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Requesting signed URL for agent:", ELEVENLABS_AGENT_ID);

    // Try to get a signed URL for the agent
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${ELEVENLABS_AGENT_ID}`,
      {
        method: "GET",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs signed URL error:", response.status, errorText);
      
      // Fallback to public agent if signed URL fails
      return new Response(
        JSON.stringify({ 
          agentId: ELEVENLABS_AGENT_ID,
          usePublicAgent: true,
          error: `Signed URL failed: ${response.status}` 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { signed_url } = await response.json();
    console.log("Got signed URL successfully");

    return new Response(
      JSON.stringify({ 
        signedUrl: signed_url,
        agentId: ELEVENLABS_AGENT_ID 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("elevenlabs-agent-token error:", error);
    
    // Fallback to public agent on error
    return new Response(
      JSON.stringify({ 
        agentId: ELEVENLABS_AGENT_ID,
        usePublicAgent: true,
        error: String(error)
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
