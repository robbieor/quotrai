import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all teams with George voice enabled to create snapshots
    const { data: teams, error: fetchError } = await supabase
      .from("teams")
      .select("id, george_voice_minutes_used, george_voice_minutes_limit, george_voice_seats, george_usage_reset_date")
      .gt("george_voice_seats", 0);

    if (fetchError) {
      console.error("Error fetching teams:", fetchError);
      throw fetchError;
    }

    const now = new Date();
    let snapshotsCreated = 0;

    // Create usage snapshots for each team before resetting
    if (teams && teams.length > 0) {
      const snapshots = teams.map((team) => ({
        team_id: team.id,
        period_start: team.george_usage_reset_date || now.toISOString(),
        period_end: now.toISOString(),
        minutes_used: team.george_voice_minutes_used || 0,
        minutes_limit: team.george_voice_seats * 60,
        george_voice_seats: team.george_voice_seats || 0,
      }));

      const { error: snapshotError } = await supabase
        .from("george_usage_snapshots")
        .insert(snapshots);

      if (snapshotError) {
        console.error("Error creating usage snapshots:", snapshotError);
        throw snapshotError;
      }

      snapshotsCreated = snapshots.length;
      console.log(`Created ${snapshotsCreated} usage snapshots`);
    }

    // Reset george_voice_minutes_used to 0 and update the reset date for all teams
    const { error: resetError } = await supabase
      .from("teams")
      .update({
        george_voice_minutes_used: 0,
        george_usage_reset_date: now.toISOString(),
      })
      .gt("george_voice_seats", 0);

    if (resetError) {
      console.error("Error resetting George voice minutes:", resetError);
      throw resetError;
    }

    console.log("Successfully reset George voice minutes for all teams");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "George voice minutes reset successfully",
        snapshots_created: snapshotsCreated,
        timestamp: now.toISOString()
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in reset-george-minutes:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});
