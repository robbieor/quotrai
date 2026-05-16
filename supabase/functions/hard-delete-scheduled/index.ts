// hard-delete-scheduled: daily cron job. Hard-deletes any profile whose
// scheduled_deletion_at has passed. Cancels Stripe, suppresses email,
// then calls auth.admin.deleteUser which cascades via FK.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: due, error } = await admin
    .from("profiles")
    .select("id, email")
    .lte("scheduled_deletion_at", new Date().toISOString())
    .limit(50);

  if (error) {
    console.error("hard-delete-scheduled query error", error);
    return new Response(JSON.stringify({ error: "query failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: Array<{ id: string; ok: boolean; error?: string }> = [];

  for (const profile of due ?? []) {
    try {
      // Best-effort: cancel Stripe subscription
      try {
        await admin.functions.invoke("cancel-subscription", {
          body: { userId: profile.id, reason: "account_deletion" },
        });
      } catch (e) {
        console.error("cancel-subscription failed (continuing)", profile.id, e);
      }

      // Best-effort: add email to suppression so we never re-email after delete
      if (profile.email) {
        try {
          await admin.from("suppressed_emails").upsert({
            email: profile.email.toLowerCase(),
            reason: "account_deleted",
          }, { onConflict: "email" });
        } catch (e) {
          console.error("suppression failed (continuing)", e);
        }
      }

      // Hard delete auth user — FK cascade removes the profile row + child data
      const { error: delErr } = await admin.auth.admin.deleteUser(profile.id);
      if (delErr) {
        throw delErr;
      }

      results.push({ id: profile.id, ok: true });
    } catch (e) {
      console.error("hard-delete failed", profile.id, e);
      results.push({
        id: profile.id,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return new Response(
    JSON.stringify({ processed: results.length, results }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    },
  );
});
