import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatRequest {
  message: string;
  conversation_id: string | null;
  memory_context?: {
    current_customer?: { id: string; name: string };
    current_job?: { id: string; title: string };
    current_quote?: { id: string; number: string };
    current_invoice?: { id: string; number: string };
  };
}

// ─── TOOL DEFINITIONS ───────────────────────────────────────────────
const tools = [
  {
    type: "function",
    function: {
      name: "get_today_summary",
      description: "Get a morning briefing summary including today's jobs, recent payments, overdue invoices, and pending quotes",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "get_week_ahead_summary",
      description: "Get a weekly planning summary including upcoming jobs, expected income, invoices due, and expiring quotes for the next 7 days",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "get_todays_jobs",
      description: "Get jobs scheduled for today",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "get_jobs_for_date",
      description: "Get jobs scheduled for a specific date",
      parameters: {
        type: "object",
        properties: { date: { type: "string", description: "YYYY-MM-DD" } },
        required: ["date"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "check_availability",
      description: "Check available time slots for a specific date",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "YYYY-MM-DD" },
          preferred_time: { type: "string", description: "HH:MM" }
        },
        required: ["date"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_job",
      description: "Create a new job/appointment in the calendar",
      parameters: {
        type: "object",
        properties: {
          client_name: { type: "string" },
          job_title: { type: "string" },
          scheduled_date: { type: "string", description: "YYYY-MM-DD" },
          scheduled_time: { type: "string", description: "HH:MM (24h)" },
          description: { type: "string" },
          estimated_value: { type: "number" }
        },
        required: ["client_name", "job_title", "scheduled_date"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "reschedule_job",
      description: "Reschedule an existing job to a new date/time",
      parameters: {
        type: "object",
        properties: {
          job_title: { type: "string" },
          client_name: { type: "string" },
          new_date: { type: "string", description: "YYYY-MM-DD" },
          new_time: { type: "string", description: "HH:MM (24h)" }
        },
        required: ["new_date"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_job_status",
      description: "Update the status of a job",
      parameters: {
        type: "object",
        properties: {
          job_title: { type: "string" },
          client_name: { type: "string" },
          new_status: { type: "string", enum: ["pending", "scheduled", "in_progress", "completed", "cancelled"] }
        },
        required: ["new_status"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_quote",
      description: "Create a new quote/estimate for a client. IMPORTANT: Always create as draft. Never send to client automatically.",
      parameters: {
        type: "object",
        properties: {
          client_name: { type: "string" },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                description: { type: "string" },
                quantity: { type: "number" },
                unit_price: { type: "number" }
              },
              required: ["description", "quantity", "unit_price"]
            }
          },
          notes: { type: "string" },
          tax_rate: { type: "number" }
        },
        required: ["client_name", "items"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_overdue_invoices",
      description: "Get list of overdue invoices",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "send_invoice_reminder",
      description: "Draft a payment reminder for an invoice. Does NOT send automatically — requires user confirmation.",
      parameters: {
        type: "object",
        properties: {
          invoice_number: { type: "string" },
          invoice_id: { type: "string" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "log_expense",
      description: "Log a business expense",
      parameters: {
        type: "object",
        properties: {
          vendor_name: { type: "string" },
          amount: { type: "number" },
          category: { type: "string", enum: ["materials", "fuel", "tools", "labor", "permits", "other"] },
          description: { type: "string" }
        },
        required: ["vendor_name", "amount"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_client_info",
      description: "Look up information about a client/customer",
      parameters: {
        type: "object",
        properties: { client_name: { type: "string" } },
        required: ["client_name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_templates",
      description: "Get available quote/job templates",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "create_invoice_from_template",
      description: "Create a draft invoice for a client using a template. Does NOT send automatically.",
      parameters: {
        type: "object",
        properties: {
          client_name: { type: "string" },
          template_name: { type: "string" },
          additional_notes: { type: "string" }
        },
        required: ["client_name", "template_name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "use_template_for_quote",
      description: "Create a draft quote for a client using a template. Does NOT send automatically.",
      parameters: {
        type: "object",
        properties: {
          client_name: { type: "string" },
          template_name: { type: "string" },
          additional_notes: { type: "string" }
        },
        required: ["client_name", "template_name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_template_details",
      description: "Get full details of a specific template including line items and pricing.",
      parameters: {
        type: "object",
        properties: {
          template_name: { type: "string" },
          template_id: { type: "string" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_invoice",
      description: "Create a new draft invoice for a client with line items. Does NOT send automatically.",
      parameters: {
        type: "object",
        properties: {
          client_name: { type: "string" },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                description: { type: "string" },
                quantity: { type: "number" },
                unit_price: { type: "number" }
              },
              required: ["description", "quantity", "unit_price"]
            }
          },
          notes: { type: "string" },
          tax_rate: { type: "number" }
        },
        required: ["client_name", "items"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_templates",
      description: "Search for templates by keyword or job type.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          category: { type: "string" }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_template_categories",
      description: "List all template categories.",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "suggest_template",
      description: "Suggest the best template for a job based on description.",
      parameters: {
        type: "object",
        properties: { job_description: { type: "string" } },
        required: ["job_description"]
      }
    }
  }
];

// ─── INTENT CLASSIFICATION ──────────────────────────────────────────
function classifyIntent(toolCalls: any[]): { intent: string; label: string; outputType: string } {
  if (!toolCalls?.length) return { intent: "chat", label: "Chat", outputType: "text" };
  const name = toolCalls[0].function.name;
  const map: Record<string, { intent: string; label: string; outputType: string }> = {
    create_quote: { intent: "create_quote", label: "Create Quote", outputType: "quote" },
    use_template_for_quote: { intent: "create_quote", label: "Create Quote from Template", outputType: "quote" },
    create_invoice: { intent: "create_invoice", label: "Create Invoice", outputType: "invoice" },
    create_invoice_from_template: { intent: "create_invoice", label: "Create Invoice from Template", outputType: "invoice" },
    create_job: { intent: "create_job", label: "Schedule Job", outputType: "job" },
    reschedule_job: { intent: "reschedule_job", label: "Reschedule Job", outputType: "job" },
    update_job_status: { intent: "update_job", label: "Update Job Status", outputType: "job" },
    log_expense: { intent: "log_expense", label: "Log Expense", outputType: "expense" },
    get_client_info: { intent: "lookup_client", label: "Client Lookup", outputType: "client" },
    send_invoice_reminder: { intent: "send_reminder", label: "Draft Reminder", outputType: "reminder" },
    get_todays_jobs: { intent: "view_schedule", label: "Today's Schedule", outputType: "info" },
    get_jobs_for_date: { intent: "view_schedule", label: "View Schedule", outputType: "info" },
    get_today_summary: { intent: "briefing", label: "Morning Briefing", outputType: "info" },
    get_week_ahead_summary: { intent: "briefing", label: "Week Ahead", outputType: "info" },
    get_overdue_invoices: { intent: "overdue", label: "Overdue Invoices", outputType: "info" },
    check_availability: { intent: "check_availability", label: "Check Availability", outputType: "info" },
    get_templates: { intent: "templates", label: "Browse Templates", outputType: "info" },
    get_template_details: { intent: "templates", label: "Template Details", outputType: "info" },
    search_templates: { intent: "templates", label: "Search Templates", outputType: "info" },
    list_template_categories: { intent: "templates", label: "Template Categories", outputType: "info" },
    suggest_template: { intent: "templates", label: "Template Suggestion", outputType: "info" },
  };
  return map[name] || { intent: name, label: name, outputType: "info" };
}

// ─── ENTITY EXTRACTION ──────────────────────────────────────────────
function extractEntities(toolCalls: any[]): any[] {
  if (!toolCalls?.length) return [];
  const entities: any[] = [];
  for (const tc of toolCalls) {
    let params: Record<string, any> = {};
    try { params = JSON.parse(tc.function.arguments || "{}"); } catch { continue; }
    const fieldLabels: Record<string, string> = {
      client_name: "Customer",
      job_title: "Job",
      scheduled_date: "Date",
      scheduled_time: "Time",
      new_date: "New Date",
      new_time: "New Time",
      new_status: "Status",
      template_name: "Template",
      vendor_name: "Vendor",
      amount: "Amount",
      category: "Category",
      description: "Description",
      estimated_value: "Value",
      notes: "Notes",
      tax_rate: "Tax Rate",
      invoice_number: "Invoice",
      date: "Date",
      query: "Search",
      job_description: "Job Type",
    };
    for (const [key, value] of Object.entries(params)) {
      if (key === "items") continue; // skip array items for now
      if (value !== undefined && value !== null && value !== "") {
        const displayValue = key === "amount" || key === "estimated_value" 
          ? `€${Number(value).toLocaleString()}` 
          : String(value);
        entities.push({
          key,
          label: fieldLabels[key] || key,
          value: displayValue,
          confidence: "high",
        });
      }
    }
  }
  return entities;
}

// ─── BUILD ACTION STEPS ─────────────────────────────────────────────
function buildActionSteps(toolCalls: any[], toolResults: any[]): any[] {
  if (!toolCalls?.length) return [];
  
  const steps: any[] = [];
  
  for (let i = 0; i < toolCalls.length; i++) {
    const tc = toolCalls[i];
    const result = toolResults[i];
    const name = tc.function.name;
    
    const stepLabels: Record<string, string[]> = {
      create_quote: ["Searching customer", "Creating draft quote", "Adding line items", "Calculating totals", "Saving quote"],
      use_template_for_quote: ["Searching customer", "Loading template", "Creating draft quote", "Applying template items", "Saving quote"],
      create_invoice_from_template: ["Searching customer", "Loading template", "Creating draft invoice", "Applying template items", "Saving invoice"],
      create_job: ["Searching customer", "Checking availability", "Creating job", "Scheduling"],
      reschedule_job: ["Finding job", "Checking new date availability", "Updating schedule"],
      log_expense: ["Recording expense", "Categorising", "Saving"],
      get_client_info: ["Searching customers"],
      get_todays_jobs: ["Fetching today's schedule"],
      get_overdue_invoices: ["Checking invoices"],
      send_invoice_reminder: ["Finding invoice", "Drafting reminder"],
      get_today_summary: ["Gathering metrics", "Building briefing"],
      get_week_ahead_summary: ["Loading schedule", "Analysing upcoming week"],
    };

    const labels = stepLabels[name] || [`Running ${name}`];
    const isSuccess = result && !result.error;

    for (let j = 0; j < labels.length; j++) {
      steps.push({
        id: `${name}-${j}`,
        label: labels[j],
        status: isSuccess ? "complete" : (j === labels.length - 1 && !isSuccess ? "failed" : "complete"),
        completed_at: new Date().toISOString(),
        error_message: j === labels.length - 1 && !isSuccess ? (result?.error || "Action failed") : undefined,
      });
    }
  }

  return steps;
}

// ─── CHECK IF CONFIRMATION NEEDED ───────────────────────────────────
function needsConfirmation(toolCalls: any[]): any | null {
  if (!toolCalls?.length) return null;
  const name = toolCalls[0].function.name;
  
  // External communication actions always require confirmation
  if (name === "send_invoice_reminder") {
    return {
      id: crypto.randomUUID(),
      message: "This will send a payment reminder to the client. Do you want to proceed?",
      risk_level: "high",
      actions: [
        { label: "Send Reminder", action: "confirm", variant: "default" },
        { label: "Review First", action: "review", variant: "outline" },
        { label: "Cancel", action: "cancel", variant: "outline" },
      ],
    };
  }
  return null;
}

// ─── BUILD OUTPUT ───────────────────────────────────────────────────
function buildOutput(intent: any, toolCalls: any[], toolResults: any[]): any | null {
  if (!toolCalls?.length || !toolResults?.length) return null;
  
  const result = toolResults[0]?.result || toolResults[0];
  const name = toolCalls[0].function.name;
  let params: any = {};
  try { params = JSON.parse(toolCalls[0].function.arguments || "{}"); } catch {}

  const isWrite = ["create_quote", "use_template_for_quote", "create_invoice_from_template", "create_job", "log_expense"].includes(name);
  
  if (!isWrite) return null; // Info responses are handled via text_response

  const quickActions = [
    { label: "Edit", action: "edit", variant: "outline" as const },
    { label: "Save Draft", action: "save_draft", variant: "default" as const },
  ];

  // Never auto-add "Send" — user must request it explicitly
  
  return {
    type: intent.outputType,
    title: result?.message || `${intent.label} completed`,
    summary: result?.quote_number || result?.invoice_number || result?.job_id 
      ? `Record created successfully` 
      : undefined,
    record_id: result?.quote_id || result?.invoice_id || result?.job_id || result?.expense_id,
    record_number: result?.quote_number || result?.invoice_number,
    preview_data: params.client_name ? { Customer: params.client_name } : undefined,
    quick_actions: quickActions,
  };
}

// ─── BUILD MEMORY CONTEXT ───────────────────────────────────────────
function buildMemory(toolCalls: any[], toolResults: any[], existingMemory?: any): any {
  const memory = existingMemory || {};
  if (!toolCalls?.length) return memory;
  
  let params: any = {};
  try { params = JSON.parse(toolCalls[0].function.arguments || "{}"); } catch {}
  const result = toolResults?.[0]?.result || toolResults?.[0];

  if (params.client_name) {
    memory.current_customer = { 
      id: result?.customer_id || "", 
      name: params.client_name 
    };
  }
  if (result?.quote_id) {
    memory.current_quote = { id: result.quote_id, number: result.quote_number || "" };
  }
  if (result?.invoice_id) {
    memory.current_invoice = { id: result.invoice_id, number: result.invoice_number || "" };
  }
  if (result?.job_id && params.job_title) {
    memory.current_job = { id: result.job_id, title: params.job_title };
  }

  return memory;
}

// ─── MAIN HANDLER ───────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: profile } = await serviceSupabase
      .from("profiles")
      .select("team_id, full_name")
      .eq("id", userId)
      .single();

    if (!profile?.team_id) {
      return new Response(
        JSON.stringify({ error: "User not in a team" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: membership } = await serviceSupabase
      .from("team_memberships")
      .select("id")
      .eq("user_id", userId)
      .eq("team_id", profile.team_id)
      .single();

    if (!membership) {
      return new Response(
        JSON.stringify({ error: "Not a team member" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const teamId = profile.team_id;
    const userName = profile.full_name || "there";
    const { message, conversation_id, memory_context }: ChatRequest = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("george-chat: Processing message:", message);

    // ─── CONVERSATION MANAGEMENT ──────────────────────────────────
    let activeConversationId = conversation_id;
    if (!activeConversationId) {
      const { data: newConv } = await serviceSupabase
        .from("george_conversations")
        .insert({
          team_id: teamId,
          user_id: userId,
          title: message.slice(0, 50) + (message.length > 50 ? "..." : ""),
        })
        .select("id")
        .single();
      if (newConv) activeConversationId = newConv.id;
    }

    if (activeConversationId) {
      await serviceSupabase
        .from("george_messages")
        .insert({ conversation_id: activeConversationId, role: "user", content: message });
    }

    // ─── CONVERSATION HISTORY ─────────────────────────────────────
    let history: { role: string; content: string }[] = [];
    if (activeConversationId) {
      const { data: messages } = await serviceSupabase
        .from("george_messages")
        .select("role, content")
        .eq("conversation_id", activeConversationId)
        .order("created_at", { ascending: true })
        .limit(20);
      history = (messages || []).slice(0, -1);
    }

    // ─── DATE CONTEXT ─────────────────────────────────────────────
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const dayOfWeek = now.toLocaleDateString("en-US", { weekday: "long" });
    const year = now.getFullYear();
    const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(now); nextWeek.setDate(nextWeek.getDate() + 7);

    // ─── MEMORY CONTEXT ──────────────────────────────────────────
    let memoryPrompt = "";
    if (memory_context) {
      const parts: string[] = [];
      if (memory_context.current_customer) parts.push(`Current customer: ${memory_context.current_customer.name}`);
      if (memory_context.current_job) parts.push(`Current job: ${memory_context.current_job.title}`);
      if (memory_context.current_quote) parts.push(`Current quote: ${memory_context.current_quote.number}`);
      if (memory_context.current_invoice) parts.push(`Current invoice: ${memory_context.current_invoice.number}`);
      if (parts.length > 0) {
        memoryPrompt = `\n\nACTIVE CONTEXT (from current session):\n${parts.join("\n")}\nUse this context when the user says "same customer", "that quote", etc.`;
      }
    }

    const systemPrompt = `You are Foreman AI, a professional AI assistant for Quotr — a trade business management platform for electricians, plumbers, and field service professionals in Ireland and the UK.

CRITICAL DATE CONTEXT:
- TODAY: ${today} (${dayOfWeek}), YEAR: ${year}
- Tomorrow: ${tomorrow.toISOString().split("T")[0]}
- Next week: ${nextWeek.toISOString().split("T")[0]}
User's name: ${userName}

IMPORTANT RULES:
1. ALWAYS use ${year} as the year unless explicitly told otherwise.
2. "Tomorrow" = ${tomorrow.toISOString().split("T")[0]}. "Next week" = ${nextWeek.toISOString().split("T")[0]}.
3. NEVER automatically send anything to clients. All quotes, invoices, and reminders are created as DRAFTS.
4. When creating records, ALWAYS mention they are saved as drafts and the user can review/send them manually.
5. Use tools to actually perform actions — don't just describe what you would do.
6. When a job type is mentioned, proactively suggest a relevant template.
7. VAT is automatically applied — don't ask about it unless the user mentions a custom rate.
8. Be concise, professional, and trade-aware.${memoryPrompt}`;

    // ─── AI CALL ──────────────────────────────────────────────────
    const actionId = crypto.randomUUID();

    if (!lovableApiKey) {
      const fallbackMsg = "I can help you check today's jobs, create quotes, log expenses, or chase overdue invoices. What would you like to do?";
      if (activeConversationId) {
        await serviceSupabase.from("george_messages").insert({
          conversation_id: activeConversationId, role: "assistant", content: fallbackMsg,
        });
      }
      return new Response(
        JSON.stringify({
          message: fallbackMsg,
          conversation_id: activeConversationId,
          action_plan: {
            action_id: actionId,
            status: "completed",
            input_source: "typed",
            command_text: message,
            timestamp: now.toISOString(),
            intent: "chat",
            intent_label: "Chat",
            entities: [],
            steps: [],
            text_response: fallbackMsg,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ];

    console.log("george-chat: Calling AI with tools");

    let aiData: any;
    try {
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${lovableApiKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: aiMessages,
          tools,
          tool_choice: "auto",
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error("AI request failed:", errorText);
        throw new Error("AI request failed");
      }

      aiData = await aiResponse.json();
    } catch (aiErr) {
      console.error("george-chat: AI call failed:", aiErr);
      const fallbackMsg = "I'm having trouble right now. You can still use the app normally — please try again in a minute.";
      if (activeConversationId) {
        await serviceSupabase.from("george_messages").insert({
          conversation_id: activeConversationId, role: "assistant", content: fallbackMsg,
        });
        await serviceSupabase.from("george_conversations")
          .update({ updated_at: now.toISOString() })
          .eq("id", activeConversationId);
      }
      return new Response(
        JSON.stringify({
          message: fallbackMsg,
          conversation_id: activeConversationId,
          action_plan: {
            action_id: actionId,
            status: "failed",
            input_source: "typed",
            command_text: message,
            timestamp: now.toISOString(),
            intent: "chat",
            intent_label: "Chat",
            entities: [],
            steps: [{ id: "ai-call", label: "Connecting to AI", status: "failed", error_message: "Service temporarily unavailable" }],
            text_response: fallbackMsg,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const choice = aiData.choices?.[0];
    let finalMessage = "";
    let toolCalls = choice?.message?.tool_calls || [];
    let toolResults: any[] = [];

    // ─── TOOL EXECUTION ───────────────────────────────────────────
    if (toolCalls.length > 0) {
      for (const toolCall of toolCalls) {
        const functionName = toolCall.function.name;
        let parameters = {};
        try { parameters = JSON.parse(toolCall.function.arguments || "{}"); } catch {}

        console.log(`george-chat: Calling webhook ${functionName}`, parameters);

        const webhookResponse = await fetch(`${supabaseUrl}/functions/v1/george-webhook`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
          },
          body: JSON.stringify({ function_name: functionName, parameters }),
        });

        const webhookData = await webhookResponse.json();
        console.log(`george-chat: Webhook response for ${functionName}:`, webhookData);
        toolResults.push({ name: functionName, result: webhookData });
      }

      // Follow-up AI call with tool results
      const toolResultMessages = toolResults.map((tr, idx) => ({
        role: "tool" as const,
        tool_call_id: toolCalls[idx].id,
        content: JSON.stringify(tr.result),
      }));

      const followUpMessages = [
        ...aiMessages,
        choice.message,
        ...toolResultMessages,
      ];

      try {
        const followUpResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${lovableApiKey}`,
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: followUpMessages,
            temperature: 0.7,
            max_tokens: 500,
          }),
        });

        if (followUpResponse.ok) {
          const followUpData = await followUpResponse.json();
          finalMessage = followUpData.choices?.[0]?.message?.content ||
            toolResults.map((tr) => tr.result.message || `Completed ${tr.name}`).join("\n\n");
        } else {
          finalMessage = toolResults.map((tr) => tr.result.message || `Completed ${tr.name}`).join("\n\n");
        }
      } catch {
        finalMessage = toolResults.map((tr) => tr.result.message || `Completed ${tr.name}`).join("\n\n");
      }
    } else {
      finalMessage = choice?.message?.content || "I'm here to help you manage your business. What would you like to do?";
    }

    // ─── PERSIST RESPONSE ─────────────────────────────────────────
    if (activeConversationId) {
      await serviceSupabase.from("george_messages").insert({
        conversation_id: activeConversationId, role: "assistant", content: finalMessage,
      });
      await serviceSupabase.from("george_conversations")
        .update({ updated_at: now.toISOString() })
        .eq("id", activeConversationId);
    }

    // ─── BUILD STRUCTURED ACTION PLAN ─────────────────────────────
    const intentInfo = classifyIntent(toolCalls);
    const entities = extractEntities(toolCalls);
    const steps = buildActionSteps(toolCalls, toolResults);
    const confirmation = needsConfirmation(toolCalls);
    const output = buildOutput(intentInfo, toolCalls, toolResults);
    const updatedMemory = buildMemory(toolCalls, toolResults, memory_context);

    const hasAction = toolCalls.length > 0;
    const anyFailed = steps.some((s: any) => s.status === "failed");

    const actionPlan = {
      action_id: actionId,
      status: confirmation ? "needs_confirmation" : anyFailed ? "failed" : "completed",
      input_source: "typed",
      command_text: message,
      timestamp: now.toISOString(),
      intent: intentInfo.intent,
      intent_label: intentInfo.label,
      entities,
      steps,
      output,
      text_response: finalMessage,
      confirmation_gate: confirmation,
      memory_context: Object.keys(updatedMemory).length > 0 ? updatedMemory : undefined,
      conversation_id: activeConversationId,
    };

    // ─── AUDIT LOG ────────────────────────────────────────────────
    if (hasAction) {
      try {
        await serviceSupabase.from("ai_action_audit").insert({
          team_id: teamId,
          user_id: userId,
          action_id: actionId,
          command_text: message,
          intent: intentInfo.intent,
          intent_label: intentInfo.label,
          entities: JSON.stringify(entities),
          steps: JSON.stringify(steps),
          status: actionPlan.status,
          output_type: intentInfo.outputType,
          output_record_id: output?.record_id || null,
          confirmation_required: !!confirmation,
          conversation_id: activeConversationId,
        });
      } catch (auditErr) {
        console.error("george-chat: Audit log error (non-fatal):", auditErr);
      }
    }

    return new Response(
      JSON.stringify({
        message: finalMessage,
        conversation_id: activeConversationId,
        action_plan: hasAction ? actionPlan : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("george-chat error:", error);
    return new Response(
      JSON.stringify({ message: "Sorry, I encountered an issue. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
