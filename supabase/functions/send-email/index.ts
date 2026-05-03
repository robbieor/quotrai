import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

import { EMAIL_FROM_DOMAIN as FROM_DOMAIN, EMAIL_SENDER_DOMAIN as SENDER_DOMAIN } from "../_shared/email-config.ts";

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[SEND-EMAIL] ${step}${d}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // GUARD 1: Global kill switch
    const outboundEnabled = Deno.env.get("OUTBOUND_COMMUNICATION_ENABLED");
    if (outboundEnabled !== "true") {
      const body = await req.clone().json().catch(() => ({}));
      logStep("BLOCKED: Global kill switch is OFF", { outboundEnabled });
      await supabase.from("comms_audit_log").insert({
        user_id: null, team_id: null,
        record_type: body.record_type || null, record_id: body.record_id || null,
        recipient: Array.isArray(body.to) ? body.to.join(", ") : body.to || null,
        channel: "email", template: body.template || null,
        manual_send: body.manual_send || false, confirmed_by_user: body.confirmed_by_user || false,
        source_screen: body.source_screen || null, allowed: false,
        blocked_reason: "OUTBOUND_COMMUNICATION_ENABLED is not true (kill switch)",
      });
      return new Response(
        JSON.stringify({ error: "Outbound communication is currently disabled" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData.user) throw new Error("Unauthorized");

    const body = await req.json();
    const { to, subject, html, from, replyTo, manual_send, confirmed_by_user, source_screen, record_type, record_id, template } = body;

    if (!to || !subject || !html) throw new Error("Missing required fields: to, subject, html");

    // GUARD 2: Require explicit manual send context
    const missingFields: string[] = [];
    if (manual_send !== true) missingFields.push("manual_send must be true");
    if (confirmed_by_user !== true) missingFields.push("confirmed_by_user must be true");
    if (!source_screen) missingFields.push("source_screen is required");
    if (!record_type) missingFields.push("record_type is required");
    if (!record_id) missingFields.push("record_id is required");

    if (missingFields.length > 0) {
      logStep("BLOCKED: Missing manual send context", { missingFields });
      const { data: profile } = await supabase.from("profiles").select("team_id").eq("id", userData.user.id).single();
      await supabase.from("comms_audit_log").insert({
        user_id: userData.user.id, team_id: profile?.team_id || null,
        record_type: record_type || null, record_id: record_id || null,
        recipient: Array.isArray(to) ? to.join(", ") : to,
        channel: "email", template: template || null,
        manual_send: manual_send || false, confirmed_by_user: confirmed_by_user || false,
        source_screen: source_screen || null, allowed: false,
        blocked_reason: `Missing required fields: ${missingFields.join("; ")}`,
      });
      return new Response(
        JSON.stringify({ error: "Manual send context required", details: missingFields }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Sending email (manual send confirmed)", { to, subject, source_screen, record_type });

    // Get branding for from address if not specified
    let fromAddress = from;
    if (!fromAddress) {
      const { data: profile } = await supabase.from("profiles").select("team_id").eq("id", userData.user.id).single();
      if (profile?.team_id) {
        const { data: branding } = await supabase.from("company_branding").select("company_name, company_email").eq("team_id", profile.team_id).single();
        if (branding?.company_name) {
          fromAddress = `${branding.company_name} <support@${FROM_DOMAIN}>`;
        }
      }
      if (!fromAddress) fromAddress = `Revamo <support@${FROM_DOMAIN}>`;
    }

    const recipients = Array.isArray(to) ? to : [to];
    const messageId = crypto.randomUUID();

    await supabase.from("email_send_log").insert({
      message_id: messageId,
      template_name: template || "generic",
      recipient_email: recipients[0],
      status: "pending",
    });

    const { error: enqueueError } = await supabase.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        message_id: messageId,
        to: recipients[0],
        from: fromAddress,
        sender_domain: SENDER_DOMAIN,
        subject,
        html,
        text: html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().substring(0, 500),
        purpose: "transactional",
        label: template || "generic",
        queued_at: new Date().toISOString(),
      },
    });

    if (enqueueError) {
      logStep("Enqueue error", enqueueError);
      throw new Error("Failed to enqueue email");
    }

    logStep("Email enqueued successfully", { messageId });

    // Audit log: ALLOWED
    const { data: profileForAudit } = await supabase.from("profiles").select("team_id").eq("id", userData.user.id).single();
    await supabase.from("comms_audit_log").insert({
      user_id: userData.user.id, team_id: profileForAudit?.team_id || null,
      record_type, record_id,
      recipient: Array.isArray(to) ? to.join(", ") : to,
      channel: "email", template: template || null,
      manual_send: true, confirmed_by_user: true,
      source_screen, allowed: true, blocked_reason: null,
      metadata: { message_id: messageId },
    });

    return new Response(JSON.stringify({ success: true, queued: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
