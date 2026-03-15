import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VALID_CATEGORIES = [
  "materials", "equipment", "vehicle", "fuel", "tools",
  "subcontractor", "insurance", "office", "utilities",
  "marketing", "travel", "meals", "other",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const body = await req.json();

    const {
      from: senderEmail,
      to: recipientEmail,
      subject,
      text: textBody,
      html: htmlBody,
    } = body;

    console.log(`Processing expense email from: ${senderEmail}, subject: ${subject}`);

    const toAddress = Array.isArray(recipientEmail) ? recipientEmail[0] : recipientEmail;
    const toAddr = typeof toAddress === "string" ? toAddress : (toAddress?.address || "");
    const codeMatch = toAddr.match(/expenses\+([a-z0-9]+)@/i);
    
    if (!codeMatch?.[1]) {
      return new Response(JSON.stringify({ success: false, error: "Invalid forwarding address." }), { 
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const forwardCode = codeMatch[1].toLowerCase();

    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("id, team_id")
      .eq("expense_forward_code", forwardCode)
      .maybeSingle();

    if (!profile?.team_id) {
      return new Response(JSON.stringify({ success: false, error: "Forwarding code not recognised." }), { 
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const senderAddr = typeof senderEmail === "string" 
      ? senderEmail 
      : (senderEmail?.address || senderEmail?.[0]?.address || senderEmail?.[0] || "unknown");

    const emailContent = textBody || htmlBody?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() || "";

    if (!emailContent && !subject) {
      return new Response(JSON.stringify({ success: false, error: "Empty email content" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiPrompt = `You are an expense parser for tradespeople. Extract expense details from this forwarded supplier invoice/receipt email.\n\nEmail subject: ${subject || "No subject"}\n\nEmail content:\n${emailContent.substring(0, 3000)}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an expense parser for tradespeople." },
          { role: "user", content: aiPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "log_expense",
            description: "Log a parsed expense from a supplier invoice or receipt email.",
            parameters: {
              type: "object",
              properties: {
                description: { type: "string" },
                amount: { type: "number" },
                vendor: { type: "string" },
                date: { type: "string" },
                category: { type: "string", enum: VALID_CATEGORIES },
              },
              required: ["description", "amount", "vendor", "date", "category"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "log_expense" } },
        temperature: 0.1,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API call failed [${aiResponse.status}]: ${await aiResponse.text()}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let parsed: { description?: string; amount?: number; vendor?: string; date?: string; category?: string };
    
    if (toolCall?.function?.arguments) {
      try {
        parsed = typeof toolCall.function.arguments === "string" ? JSON.parse(toolCall.function.arguments) : toolCall.function.arguments;
      } catch {
        throw new Error("Could not extract expense details from email");
      }
    } else {
      const aiText = aiData.choices?.[0]?.message?.content || "";
      try {
        const jsonMatch = aiText.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, aiText];
        parsed = JSON.parse(jsonMatch[1].trim());
      } catch {
        throw new Error("Could not extract expense details from email");
      }
    }

    const amount = typeof parsed.amount === "number" ? parsed.amount : parseFloat(String(parsed.amount || "0"));
    if (!amount || amount <= 0) {
      return new Response(JSON.stringify({ success: false, error: "No valid amount found" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const category = VALID_CATEGORIES.includes(parsed.category || "") ? parsed.category : "other";
    const description = (parsed.description || subject || "Email expense").substring(0, 200);
    const vendor = (parsed.vendor || "").substring(0, 200) || null;
    const expenseDate = parsed.date && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date) ? parsed.date : new Date().toISOString().substring(0, 10);

    const { data: expense, error: insertError } = await adminSupabase
      .from("expenses")
      .insert({
        team_id: profile.team_id,
        category,
        description,
        amount,
        expense_date: expenseDate,
        vendor,
        notes: `Auto-imported from email | From: ${senderAddr} | Subject: ${subject || "N/A"}`,
        created_by: profile.id,
      })
      .select()
      .single();

    if (insertError) throw new Error(`Failed to create expense: ${insertError.message}`);

    console.log(`Created expense: ${expense.id} - ${description} - ${amount}`);

    // ──────────────────────────────────────────────────────────
    // COMMUNICATION SAFETY: Confirmation email gated by kill switch
    // This emails the USER (not a client), but still respects global flag.
    // ──────────────────────────────────────────────────────────
    const outboundEnabled = Deno.env.get("OUTBOUND_COMMUNICATION_ENABLED") === "true";
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    
    if (outboundEnabled && RESEND_API_KEY) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Quotr Expenses <noreply@quotr.info>",
            to: [senderAddr],
            subject: `✅ Expense logged: ${description}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #00FFB2; margin-bottom: 16px;">Expense Logged ✅</h2>
                <p>Your forwarded invoice has been automatically added to your expenses:</p>
                <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                  <tr><td style="padding: 8px 0; color: #666;">Description</td><td style="padding: 8px 0; font-weight: bold;">${description}</td></tr>
                  <tr><td style="padding: 8px 0; color: #666;">Amount</td><td style="padding: 8px 0; font-weight: bold;">${amount.toFixed(2)}</td></tr>
                  <tr><td style="padding: 8px 0; color: #666;">Vendor</td><td style="padding: 8px 0;">${vendor || "—"}</td></tr>
                  <tr><td style="padding: 8px 0; color: #666;">Date</td><td style="padding: 8px 0;">${expenseDate}</td></tr>
                  <tr><td style="padding: 8px 0; color: #666;">Category</td><td style="padding: 8px 0;">${category}</td></tr>
                </table>
                <p style="color: #666; font-size: 14px;">If this doesn't look right, just edit it in your Quotr dashboard.</p>
              </div>
            `,
          }),
        });
      } catch (emailErr) {
        console.error("Failed to send confirmation email:", emailErr);
      }
    } else {
      console.log("[SAFETY] Expense confirmation email suppressed: kill switch is off");
    }

    return new Response(JSON.stringify({ success: true, expense_id: expense.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Process expense email error:", err);
    const errorMessage = err instanceof Error ? err.message : "Internal error";
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
