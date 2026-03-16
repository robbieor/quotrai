import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Haversine distance in meters
function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { time_entry_id, event_type } = await req.json();

    if (!time_entry_id || !event_type) {
      return new Response(
        JSON.stringify({ error: "time_entry_id and event_type required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the time entry with job site
    const { data: entry, error: entryError } = await supabase
      .from("time_entries")
      .select("*, job_sites(*)")
      .eq("id", time_entry_id)
      .single();

    if (entryError || !entry) {
      return new Response(
        JSON.stringify({ error: "Time entry not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const jobSite = entry.job_sites;
    const anomalies: Array<{ type: string; details: Record<string, unknown> }> = [];
    let verified = false;

    if (event_type === "clock_in") {
      const lat = entry.clock_in_latitude;
      const lng = entry.clock_in_longitude;
      const accuracy = entry.clock_in_accuracy;

      if (lat && lng && jobSite) {
        const distance = haversineDistance(lat, lng, jobSite.latitude, jobSite.longitude);
        verified = distance <= (jobSite.geofence_radius || 200);

        if (distance > 500) {
          anomalies.push({
            type: "far_from_site",
            details: { distance_meters: Math.round(distance), threshold: 500 },
          });
        }
      }

      if (entry.clock_in_accuracy && entry.clock_in_accuracy > 200) {
        anomalies.push({
          type: "low_accuracy",
          details: { accuracy_meters: entry.clock_in_accuracy, threshold: 200 },
        });
      }

      // Update verification status
      await supabase
        .from("time_entries")
        .update({ clock_in_verified: verified })
        .eq("id", time_entry_id);

    } else if (event_type === "clock_out") {
      const lat = entry.clock_out_latitude;
      const lng = entry.clock_out_longitude;

      if (lat && lng && jobSite) {
        const distance = haversineDistance(lat, lng, jobSite.latitude, jobSite.longitude);
        verified = distance <= (jobSite.geofence_radius || 200);

        if (distance > 500) {
          anomalies.push({
            type: "far_from_site_at_checkout",
            details: { distance_meters: Math.round(distance) },
          });
        }
      }

      await supabase
        .from("time_entries")
        .update({ clock_out_verified: verified })
        .eq("id", time_entry_id);
    }

    // Log anomalies
    if (anomalies.length > 0) {
      const anomalyRecords = anomalies.map((a) => ({
        team_id: entry.team_id,
        time_entry_id,
        user_id: entry.user_id,
        anomaly_type: a.type,
        details: a.details,
      }));

      await supabase.from("time_anomalies").insert(anomalyRecords);
    }

    return new Response(
      JSON.stringify({
        verified,
        anomalies_found: anomalies.length,
        anomalies,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
