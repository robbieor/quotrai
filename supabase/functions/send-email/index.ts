import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[SEND-EMAIL] ${step}${d}`);
};

// =============================================
// HOTFIX: Communication Safety Layer
// =============================================
// ALL outbound email MUST pass through this function.
// This function enforces:
//   1. Global kill switch (OUTBOUND_COMMUNICATION_ENABLED env var, default: false)
//   2. Required manual_send + confirmed_by_user flags
//   3. Required context fields (source_screen, record_type, record_id)
//   4. Audit logging of every attempt (allowed or blocked)
//
// NO email will be sent unless ALL conditions are met.
// This prevents automated systems (cron jobs, imports, webhooks, triggers)
// from ever sending customer-facing communication without explicit user action.
// =============================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Create service-role client for audit logging (always needed)
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // ── GUARD 1: Global kill switch ──────────────────────────────────
    // OUTBOUND_COMMUNICATION_ENABLED must be explicitly "true" to allow sends.
    // Default is false — nothing goes out unless intentionally enabled.
    const outboundEnabled = Deno.env.get("OUTBOUND_COMMUNICATION_ENABLED");
    if (outboundEnabled !== "true") {
      const body = await req.clone().json().catch(() => ({}));
      logStep("BLOCKED: Global kill switch is OFF", { outboundEnabled });

      // Audit log the blocked attempt
      await supabase.from("comms_audit_log").insert({
        user_id: null,
        team_id: null,
        record_type: body.record_type || null,
        record_id: body.record_id || null,
        recipient: Array.isArray(body.to) ? body.to.join(", ") : body.to || null,
        channel: "email",
        template: body.template || null,
        manual_send: body.manual_send || false,
        confirmed_by_user: body.confirmed_by_user || false,
        source_screen: body.source_screen || null,
        allowed: false,
        blocked_reason: "OUTBOUND_COMMUNICATION_ENABLED is not true (kill switch)",
      });

      return new Response(
        JSON.stringify({ error: "Outbound communication is currently disabled" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    // ── Authenticate user ────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData.user) throw new Error("Unauthorized");

    const body = await req.json();
    const {
      to, subject, html, from, replyTo,
      // ── REQUIRED safety fields ──
      manual_send,
      confirmed_by_user,
      source_screen,
      record_type,
      record_id,
      template,
    } = body;

    if (!to || !subject || !html) {
      throw new Error("Missing required fields: to, subject, html");
    }

    // ── GUARD 2: Require explicit manual send context ────────────────
    // Both manual_send AND confirmed_by_user must be true.
    // source_screen, record_type, and record_id must be provided.
    // This ensures only direct user actions with confirmation can trigger sends.
    const missingFields: string[] = [];
    if (manual_send !== true) missingFields.push("manual_send must be true");
    if (confirmed_by_user !== true) missingFields.push("confirmed_by_user must be true");
    if (!source_screen) missingFields.push("source_screen is required");
    if (!record_type) missingFields.push("record_type is required");
    if (!record_id) missingFields.push("record_id is required");

    if (missingFields.length > 0) {
      logStep("BLOCKED: Missing manual send context", { missingFields });

      // Get team_id for audit
      const { data: profile } = await supabase
        .from("profiles")
        .select("team_id")
        .eq("id", userData.user.id)
        .single();

      await supabase.from("comms_audit_log").insert({
        user_id: userData.user.id,
        team_id: profile?.team_id || null,
        record_type: record_type || null,
        record_id: record_id || null,
        recipient: Array.isArray(to) ? to.join(", ") : to,
        channel: "email",
        template: template || null,
        manual_send: manual_send || false,
        confirmed_by_user: confirmed_by_user || false,
        source_screen: source_screen || null,
        allowed: false,
        blocked_reason: `Missing required fields: ${missingFields.join("; ")}`,
      });

      return new Response(
        JSON.stringify({ error: "Manual send context required", details: missingFields }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── All guards passed — proceed with send ────────────────────────
    logStep("Sending email (manual send confirmed)", { to, subject, source_screen, record_type });

    // Get branding for from address if not specified
    let fromAddress = from;
    if (!fromAddress) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("team_id")
        .eq("id", userData.user.id)
        .single();

      if (profile?.team_id) {
        const { data: branding } = await supabase
          .from("company_branding")
          .select("company_name, company_email")
          .eq("team_id", profile.team_id)
          .single();

        if (branding?.company_name) {
          fromAddress = `${branding.company_name} <noreply@quotr.ie>`;
        }
      }
      if (!fromAddress) fromAddress = "Quotr <noreply@quotr.ie>";
    }

    const emailPayload: any = {
      from: fromAddress,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    };
    if (replyTo) emailPayload.reply_to = replyTo;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    const result = await res.json();
    if (!res.ok) {
      logStep("Resend error", result);
      throw new Error(result.message || "Failed to send email");
    }

    logStep("Email sent successfully", { id: result.id });

    // ── Audit log: ALLOWED ───────────────────────────────────────────
    const { data: profileForAudit } = await supabase
      .from("profiles")
      .select("team_id")
      .eq("id", userData.user.id)
      .single();

    await supabase.from("comms_audit_log").insert({
      user_id: userData.user.id,
      team_id: profileForAudit?.team_id || null,
      record_type,
      record_id,
      recipient: Array.isArray(to) ? to.join(", ") : to,
      channel: "email",
      template: template || null,
      manual_send: true,
      confirmed_by_user: true,
      source_screen,
      allowed: true,
      blocked_reason: null,
      metadata: { resend_id: result.id },
    });

    return new Response(JSON.stringify({ success: true, id: result.id }), {
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
