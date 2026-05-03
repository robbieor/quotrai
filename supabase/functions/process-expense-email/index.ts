import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EMAIL_FROM_DOMAIN as FROM_DOMAIN, EMAIL_SENDER_DOMAIN as SENDER_DOMAIN } from "../_shared/email-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VALID_CATEGORIES = [
  "materials", "equipment", "vehicle", "fuel", "tools",
  "subcontractor", "insurance", "office", "utilities",
  "marketing", "travel", "meals", "other",
];

// Verify Cloudflare Worker HMAC signature: HMAC-SHA256(timestamp + "." + rawBody) with shared secret
async function verifyWorkerSignature(rawBody: string, timestamp: string, signature: string, secret: string): Promise<boolean> {
  if (!timestamp || !signature || !secret) return false;
  const ageSec = Math.abs(Math.floor(Date.now() / 1000) - parseInt(timestamp, 10));
  if (!Number.isFinite(ageSec) || ageSec > 300) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, enc.encode(`${timestamp}.${rawBody}`));
  const expected = Array.from(new Uint8Array(mac)).map(b => b.toString(16).padStart(2, "0")).join("");
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Cloudflare Worker posts JSON with HMAC headers. Verify signature on raw body.
    const rawBody = await req.text();
    const ts = req.headers.get("x-revamo-timestamp") || "";
    const sig = req.headers.get("x-revamo-signature") || "";
    const secret = Deno.env.get("INBOUND_EMAIL_SHARED_SECRET");
    if (!secret) {
      console.error("INBOUND_EMAIL_SHARED_SECRET not configured");
      return new Response("Server not configured", { status: 500, headers: corsHeaders });
    }
    const ok = await verifyWorkerSignature(rawBody, ts, sig, secret);
    if (!ok) {
      console.warn("Inbound email signature verification failed");
      return new Response("Invalid signature", { status: 401, headers: corsHeaders });
    }

    let senderEmail = "", recipientEmail = "", subject = "", textBody = "", htmlBody = "";
    try {
      const body = JSON.parse(rawBody);
      senderEmail = body.from || body.sender || "";
      recipientEmail = body.to || body.recipient || "";
      subject = body.subject || "";
      textBody = body.text || "";
      htmlBody = body.html || "";
    } catch {
      return new Response(JSON.stringify({ success: false, error: "Invalid JSON body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log(`Processing expense email from: ${senderEmail}, to: ${recipientEmail}, subject: ${subject}`);


    const toAddr = typeof recipientEmail === "string" ? recipientEmail : "";
    const codeMatch = toAddr.match(/expenses\+([a-z0-9]+)@/i);
    if (!codeMatch?.[1]) {
      return new Response(JSON.stringify({ success: false, error: "Invalid forwarding address." }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const forwardCode = codeMatch[1].toLowerCase();
    const { data: profile } = await adminSupabase
      .from("profiles").select("id, team_id")
      .eq("expense_forward_code", forwardCode).maybeSingle();
    if (!profile?.team_id) {
      return new Response(JSON.stringify({ success: false, error: "Forwarding code not recognised." }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const senderAddr = (senderEmail.match(/<([^>]+)>/)?.[1] || senderEmail || "unknown").trim();
    const emailContent = textBody || htmlBody?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() || "";
    if (!emailContent && !subject) {
      return new Response(JSON.stringify({ success: false, error: "Empty email content" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiPrompt = `You are an expense parser for tradespeople. Extract expense details from this forwarded supplier invoice/receipt email.\n\nEmail subject: ${subject || "No subject"}\n\nEmail content:\n${emailContent.substring(0, 3000)}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: "You are an expense parser for tradespeople." }, { role: "user", content: aiPrompt }],
        tools: [{ type: "function", function: { name: "log_expense", description: "Log a parsed expense.", parameters: { type: "object", properties: { description: { type: "string" }, amount: { type: "number" }, vendor: { type: "string" }, date: { type: "string" }, category: { type: "string", enum: VALID_CATEGORIES } }, required: ["description", "amount", "vendor", "date", "category"], additionalProperties: false } } }],
        tool_choice: { type: "function", function: { name: "log_expense" } },
        temperature: 0.1,
      }),
    });

    if (!aiResponse.ok) throw new Error(`AI API call failed [${aiResponse.status}]: ${await aiResponse.text()}`);

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let parsed: any;
    if (toolCall?.function?.arguments) {
      parsed = typeof toolCall.function.arguments === "string" ? JSON.parse(toolCall.function.arguments) : toolCall.function.arguments;
    } else {
      throw new Error("Could not extract expense details");
    }

    const amount = typeof parsed.amount === "number" ? parsed.amount : parseFloat(String(parsed.amount || "0"));
    if (!amount || amount <= 0) {
      return new Response(JSON.stringify({ success: false, error: "No valid amount found" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const category = VALID_CATEGORIES.includes(parsed.category || "") ? parsed.category : "other";
    const description = (parsed.description || subject || "Email expense").substring(0, 200);
    const vendor = (parsed.vendor || "").substring(0, 200) || null;
    const expenseDate = parsed.date && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date) ? parsed.date : new Date().toISOString().substring(0, 10);

    const { data: expense, error: insertError } = await adminSupabase.from("expenses").insert({
      team_id: profile.team_id, category, description, amount, expense_date: expenseDate,
      vendor, notes: `Auto-imported from email | From: ${senderAddr} | Subject: ${subject || "N/A"}`, created_by: profile.id,
    }).select().single();

    if (insertError) throw new Error(`Failed to create expense: ${insertError.message}`);
    console.log(`Created expense: ${expense.id} - ${description} - ${amount}`);

    // Confirmation email gated by kill switch
    const outboundEnabled = Deno.env.get("OUTBOUND_COMMUNICATION_ENABLED") === "true";
    if (outboundEnabled) {
      try {
        const messageId = crypto.randomUUID();
        const confirmHtml = [
          '<div style="font-family:Manrope,sans-serif;max-width:500px;margin:0 auto;padding:20px;">',
          '<h2 style="color:#0D9488;margin-bottom:16px;">Expense Logged \u2705</h2>',
          "<p>Your forwarded invoice has been automatically added to your expenses:</p>",
          '<table style="width:100%;border-collapse:collapse;margin:16px 0;">',
          '<tr><td style="padding:8px 0;color:#64748b;">Description</td><td style="padding:8px 0;font-weight:bold;">' + description + "</td></tr>",
          '<tr><td style="padding:8px 0;color:#64748b;">Amount</td><td style="padding:8px 0;font-weight:bold;">' + amount.toFixed(2) + "</td></tr>",
          '<tr><td style="padding:8px 0;color:#64748b;">Vendor</td><td style="padding:8px 0;">' + (vendor || "\u2014") + "</td></tr>",
          '<tr><td style="padding:8px 0;color:#64748b;">Date</td><td style="padding:8px 0;">' + expenseDate + "</td></tr>",
          '<tr><td style="padding:8px 0;color:#64748b;">Category</td><td style="padding:8px 0;">' + category + "</td></tr>",
          "</table>",
          '<p style="color:#64748b;font-size:14px;">If this doesn\'t look right, just edit it in your revamo dashboard.</p>',
          "</div>",
        ].join("");

        await adminSupabase.from("email_send_log").insert({ message_id: messageId, template_name: "expense-confirmation", recipient_email: senderAddr, status: "pending" });
        await adminSupabase.rpc("enqueue_email", {
          queue_name: "transactional_emails",
          payload: { message_id: messageId, to: senderAddr, from: `revamo Expenses <support@${FROM_DOMAIN}>`, sender_domain: SENDER_DOMAIN, subject: `\u2705 Expense logged: ${description}`, html: confirmHtml, text: `Expense logged: ${description} - ${amount.toFixed(2)}`, purpose: "transactional", label: "expense-confirmation", queued_at: new Date().toISOString() },
        });

        await adminSupabase.from("comms_audit_log").insert({
          channel: "email", record_type: "expense_confirmation", record_id: expense.id,
          recipient: senderAddr, template: "expense-confirmation",
          manual_send: false, confirmed_by_user: false,
          allowed: true, source_screen: "system",
        });
      } catch (emailErr) { console.error("Failed to send confirmation email:", emailErr); }
    } else {
      console.log("[SAFETY] Expense confirmation email suppressed: kill switch is off");
    }

    return new Response(JSON.stringify({ success: true, expense_id: expense.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("Process expense email error:", err);
    // Return 200 to Mailgun so it doesn't retry on parse errors; log captures it
    return new Response(JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Internal error" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
