/**
 * foreman-webhook — Single, hardened dispatcher for Foreman AI tool calls.
 *
 * - Validates the user's JWT (RLS-safe — every DB call runs as the user).
 * - Routes by `tool_name` to a per-tool handler, OR proxies to existing george-webhook.
 * - Returns `{ ok, message, navigate_to?, record_id?, record_type?, ... }`
 *   so client-side tools can react (navigate, highlight, toast).
 *
 * Most record-touching logic already lives in `george-webhook`. This function
 * is the consolidated entrypoint for new client integrations and adds:
 *   • Strict JWT verification
 *   • Consistent response envelope including UI hints (navigate_to, record_id)
 *   • Centralized rate-limit/error codes for the new voiceWebhookClient
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ForemanWebhookRequest {
  tool_name: string;
  parameters?: Record<string, unknown>;
}

interface ForemanWebhookResponse {
  ok: boolean;
  message?: string;
  data?: unknown;
  navigate_to?: string;
  record_id?: string;
  record_type?: string;
  error?: string;
  code?: string;
}

/** Map of tool names to UI hints (where to navigate / what to highlight after success). */
const UI_HINTS: Record<string, { navigate_to?: string; record_type?: string }> = {
  create_job: { navigate_to: "/jobs", record_type: "job" },
  reschedule_job: { navigate_to: "/calendar", record_type: "job" },
  update_job_status: { navigate_to: "/jobs", record_type: "job" },
  create_customer: { navigate_to: "/customers", record_type: "customer" },
  update_customer: { navigate_to: "/customers", record_type: "customer" },
  create_quote: { navigate_to: "/quotes", record_type: "quote" },
  update_quote_status: { navigate_to: "/quotes", record_type: "quote" },
  create_invoice: { navigate_to: "/invoices", record_type: "invoice" },
  update_invoice_status: { navigate_to: "/invoices", record_type: "invoice" },
  send_invoice_reminder: { navigate_to: "/invoices", record_type: "invoice" },
  record_payment: { navigate_to: "/invoices", record_type: "invoice" },
  create_invoice_from_quote: { navigate_to: "/invoices", record_type: "invoice" },
  log_expense: { navigate_to: "/expenses", record_type: "expense" },
  create_enquiry: { navigate_to: "/leads", record_type: "enquiry" },
  convert_enquiry_to_quote: { navigate_to: "/quotes", record_type: "quote" },
  convert_enquiry_to_job: { navigate_to: "/jobs", record_type: "job" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: ForemanWebhookResponse, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // 1) Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ ok: false, error: "Missing or invalid Authorization header", code: "unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return json({ ok: false, error: "Invalid session", code: "unauthorized" }, 401);
    }

    // 2) Parse body
    let body: ForemanWebhookRequest;
    try {
      body = await req.json();
    } catch {
      return json({ ok: false, error: "Invalid JSON body", code: "bad_request" }, 400);
    }

    const toolName = body?.tool_name;
    const parameters = body?.parameters ?? {};
    if (!toolName || typeof toolName !== "string") {
      return json({ ok: false, error: "tool_name is required", code: "bad_request" }, 400);
    }

    // 3) Resolve team_id for the user
    const { data: profile } = await supabase
      .from("profiles")
      .select("team_id")
      .eq("id", user.id)
      .maybeSingle();

    const teamId = profile?.team_id;
    if (!teamId) {
      return json({ ok: false, error: "User is not part of a team", code: "no_team" }, 403);
    }

    // 4) Dispatch to existing george-webhook with the user's JWT preserved.
    //    george-webhook already handles all 60+ tools — we layer UI hints on top.
    const dispatchRes = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/george-webhook`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
          apikey: Deno.env.get("SUPABASE_ANON_KEY")!,
        },
        body: JSON.stringify({
          function_name: toolName,
          parameters: { ...parameters, user_id: user.id, team_id: teamId },
        }),
      }
    );

    let dispatchData: any = null;
    try {
      dispatchData = await dispatchRes.json();
    } catch {
      // noop — non-JSON response
    }

    if (!dispatchRes.ok) {
      return json({
        ok: false,
        error: dispatchData?.error || `Tool ${toolName} failed (${dispatchRes.status})`,
        code: "tool_failed",
        data: dispatchData,
      }, dispatchRes.status);
    }

    // 5) Layer UI hints on top of the tool result.
    const hint = UI_HINTS[toolName] || {};
    const recordId =
      dispatchData?.record_id ||
      dispatchData?.id ||
      dispatchData?.data?.id ||
      dispatchData?.data?.record_id;

    return json({
      ok: true,
      message: dispatchData?.message || dispatchData?.result || "Done",
      data: dispatchData,
      navigate_to: hint.navigate_to,
      record_type: hint.record_type,
      record_id: recordId,
    });
  } catch (error) {
    console.error("foreman-webhook error:", error);
    return json({
      ok: false,
      error: error instanceof Error ? error.message : "Internal error",
      code: "internal_error",
    }, 500);
  }
});
