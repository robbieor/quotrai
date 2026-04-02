import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Drip schedule: step number → days after signup
const DRIP_SCHEDULE: Record<number, number> = {
  0: 0,  // Day 0: Welcome + Meet George
  1: 1,  // Day 1: Create your first quote
  2: 3,  // Day 3: Your business snapshot
  3: 5,  // Day 5: Invite your team
  4: 7,  // Day 7: Trial ending
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get all users who signed up within last 8 days and haven't completed all drip steps
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: recentProfiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email, full_name, created_at")
      .gte("created_at", eightDaysAgo)
      .limit(200);

    if (profilesError) throw profilesError;
    if (!recentProfiles?.length) {
      return new Response(JSON.stringify({ queued: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get already-sent drip steps
    const userIds = recentProfiles.map((p: any) => p.id);
    const { data: sentSteps } = await supabase
      .from("drip_sequences")
      .select("user_id, drip_step")
      .in("user_id", userIds);

    const sentMap = new Map<string, Set<number>>();
    for (const s of sentSteps || []) {
      if (!sentMap.has(s.user_id)) sentMap.set(s.user_id, new Set());
      sentMap.get(s.user_id)!.add(s.drip_step);
    }

    let queued = 0;
    const now = Date.now();

    for (const profile of recentProfiles) {
      const signupTime = new Date(profile.created_at).getTime();
      const daysSinceSignup = (now - signupTime) / (24 * 60 * 60 * 1000);
      const sent = sentMap.get(profile.id) || new Set<number>();

      for (const [stepStr, dayThreshold] of Object.entries(DRIP_SCHEDULE)) {
        const step = Number(stepStr);
        if (daysSinceSignup >= dayThreshold && !sent.has(step)) {
          // Queue the drip email
          const sendAt = new Date().toISOString();
          
          const { error: queueError } = await supabase.from("drip_queue").insert({
            user_id: profile.id,
            email: profile.email,
            full_name: profile.full_name,
            drip_step: step + 1, // drip_queue uses 1-indexed steps
            send_at: sendAt,
          });

          if (!queueError) {
            // Record in drip_sequences to prevent re-sending
            await supabase.from("drip_sequences").insert({
              user_id: profile.id,
              drip_step: step,
              email: profile.email,
            });
            queued++;
          }
        }
      }
    }

    return new Response(JSON.stringify({ queued }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Drip sequence check error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
