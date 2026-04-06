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

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");

    if (!ELEVENLABS_API_KEY) {
      console.error("ELEVENLABS_API_KEY is missing from secrets");
      return new Response(
        JSON.stringify({ 
          error: "Voice service not configured: API key missing",
          code: "missing_api_key"
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Requesting conversation token + signed URL for agent:", ELEVENLABS_AGENT_ID);

    // Fetch both token (for WebRTC) and signed URL (for WebSocket fallback) in parallel
    const [tokenRes, signedUrlRes] = await Promise.all([
      fetch(
        `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${ELEVENLABS_AGENT_ID}`,
        { headers: { "xi-api-key": ELEVENLABS_API_KEY } }
      ),
      fetch(
        `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${ELEVENLABS_AGENT_ID}`,
        { headers: { "xi-api-key": ELEVENLABS_API_KEY } }
      ),
    ]);

    if (!tokenRes.ok && !signedUrlRes.ok) {
      const errorText = await tokenRes.text();
      console.error("ElevenLabs both endpoints failed:", tokenRes.status, errorText);
      
      const code = tokenRes.status === 401 || tokenRes.status === 403 
        ? "invalid_api_key" 
        : "token_fetch_failed";
      
      return new Response(
        JSON.stringify({ 
          error: `Voice service error: ${tokenRes.status}`,
          code,
          detail: errorText.substring(0, 200)
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result: Record<string, unknown> = { agentId: ELEVENLABS_AGENT_ID };

    if (tokenRes.ok) {
      const { token } = await tokenRes.json();
      result.token = token;
      console.log("Got conversation token successfully");
    } else {
      console.warn("Token endpoint failed, using signed URL only");
    }

    if (signedUrlRes.ok) {
      const { signed_url } = await signedUrlRes.json();
      result.signed_url = signed_url;
      console.log("Got signed URL successfully");
    } else {
      console.warn("Signed URL endpoint failed, using token only");
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("elevenlabs-agent-token error:", error);
    
    return new Response(
      JSON.stringify({ 
        error: "Internal voice service error",
        code: "internal_error",
        detail: String(error).substring(0, 200)
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
