// cancel-account-deletion: GET endpoint that clears scheduled_deletion_at
// when the user clicks the cancel link in the deletion-scheduled email.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";

  if (!token || token.length < 16) {
    return html(
      "Invalid or missing token",
      "This cancellation link is invalid. Please log in and try again.",
      false,
    );
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: profile } = await admin
    .from("profiles")
    .select("id, email")
    .eq("deletion_cancel_token", token)
    .maybeSingle();

  if (!profile) {
    return html(
      "Link expired",
      "This link has already been used or has expired. If your account was deleted, you'll need to sign up again.",
      false,
    );
  }

  await admin
    .from("profiles")
    .update({
      scheduled_deletion_at: null,
      deletion_cancel_token: null,
    })
    .eq("id", profile.id);

  return html(
    "Deletion cancelled",
    `Your account (${profile.email}) is safe. You can log in again any time.`,
    true,
  );
});

function html(title: string, message: string, ok: boolean) {
  const colour = ok ? "#0D9488" : "#dc2626";
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{font-family:-apple-system,system-ui,sans-serif;background:#f8fafc;
       display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px}
  .card{background:#fff;border-radius:16px;padding:40px;max-width:480px;
        box-shadow:0 1px 3px rgba(0,0,0,.08);text-align:center}
  h1{color:${colour};margin:0 0 12px;font-size:24px}
  p{color:#475569;margin:0 0 24px;line-height:1.5}
  a{display:inline-block;background:${colour};color:#fff;padding:12px 24px;
    border-radius:8px;text-decoration:none;font-weight:600}
</style></head>
<body><div class="card">
  <h1>${title}</h1><p>${message}</p>
  <a href="https://revamoai.lovable.app/login">Back to revamo</a>
</div></body></html>`,
    {
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      status: 200,
    },
  );
}
