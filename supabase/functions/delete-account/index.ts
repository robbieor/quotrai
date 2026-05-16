// delete-account: GDPR Article 17 (Right to Erasure)
// Soft-deletes a user account by scheduling hard deletion 30 days out.
// Sends a "Cancel deletion" magic link via email. Signs the user out.
// The actual purge happens in `hard-delete-scheduled` on a daily cron.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace("Bearer ", "").trim();
    if (!jwt) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Verify user
    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData?.user) {
      return json({ error: "Unauthorized" }, 401);
    }
    const user = userData.user;

    // Load profile + role
    const { data: profile } = await admin
      .from("profiles")
      .select("id, team_id, email, full_name")
      .eq("id", user.id)
      .single();

    if (!profile) return json({ error: "Profile not found" }, 404);

    // Check team ownership: if user is the sole owner of a team that still
    // has other members, block deletion and ask them to transfer or remove.
    if (profile.team_id) {
      const { data: roleRow } = await admin
        .from("team_members")
        .select("role")
        .eq("user_id", user.id)
        .eq("team_id", profile.team_id)
        .maybeSingle();

      const isOwner = roleRow?.role === "owner" || roleRow?.role === "ceo";
      if (isOwner) {
        const { count } = await admin
          .from("team_members")
          .select("user_id", { count: "exact", head: true })
          .eq("team_id", profile.team_id)
          .neq("user_id", user.id);
        if ((count ?? 0) > 0) {
          return json({
            error: "owner_with_members",
            message:
              "You own a team that still has other members. Transfer ownership or remove members first.",
          }, 409);
        }
      }
    }

    // Generate cancel token + schedule deletion
    const token = crypto.randomUUID().replace(/-/g, "") +
      crypto.randomUUID().replace(/-/g, "");
    const scheduledAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString();

    const { error: updErr } = await admin
      .from("profiles")
      .update({
        scheduled_deletion_at: scheduledAt,
        deletion_cancel_token: token,
      })
      .eq("id", user.id);
    if (updErr) {
      console.error("delete-account update error", updErr);
      return json({ error: "Failed to schedule deletion" }, 500);
    }

    // Send confirmation email with cancel link (best-effort)
    const cancelUrl =
      `${supabaseUrl}/functions/v1/cancel-account-deletion?token=${encodeURIComponent(token)}`;

    try {
      await admin.functions.invoke("send-transactional-email", {
        body: {
          templateName: "account-deletion-scheduled",
          to: profile.email,
          idempotencyKey: `delete-account-${user.id}-${Date.now()}`,
          templateData: {
            fullName: profile.full_name || "there",
            cancelUrl,
            scheduledAt,
            daysRemaining: 30,
          },
        },
      });
    } catch (e) {
      console.error("delete-account email error (non-blocking)", e);
    }

    // Sign user out everywhere
    try {
      await admin.auth.admin.signOut(user.id);
    } catch (e) {
      console.error("signOut error (non-blocking)", e);
    }

    return json({
      ok: true,
      scheduled_deletion_at: scheduledAt,
    }, 200);
  } catch (e) {
    console.error("delete-account fatal", e);
    return json({ error: "Internal error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}
