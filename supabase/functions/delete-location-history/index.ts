// delete-location-history: wipes GPS pings + mileage trips for the requesting user.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "").trim();
    if (!jwt) return j({ error: "Unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: userData, error } = await admin.auth.getUser(jwt);
    if (error || !userData?.user) return j({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const removed: Record<string, number | string> = {};

    // Best-effort: delete from common known location tables. Each call is wrapped
    // so a missing table never aborts the rest.
    for (const table of ["gps_pings", "location_pings", "mileage_trips", "location_history"]) {
      try {
        const { error: delErr, count } = await admin
          .from(table)
          .delete({ count: "exact" })
          .eq("user_id", userId);
        if (delErr) {
          removed[table] = `error: ${delErr.message}`;
        } else {
          removed[table] = count ?? 0;
        }
      } catch (e) {
        removed[table] = `skipped: ${e instanceof Error ? e.message : "unknown"}`;
      }
    }

    return j({ ok: true, removed }, 200);
  } catch (e) {
    console.error("delete-location-history", e);
    return j({ error: "Internal error" }, 500);
  }
});

function j(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}
