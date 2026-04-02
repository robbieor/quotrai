import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { FOREMAN_TOOL_DEFINITIONS } from "../_shared/foreman-tool-definitions.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ChatRequest {
  message: string;
  conversation_id: string | null;
  stream?: boolean;
  memory_context?: {
    current_customer?: { id: string; name: string };
    current_job?: { id: string; title: string };
    current_quote?: { id: string; number: string };
    current_invoice?: { id: string; number: string };
    session_entities?: Array<{ key: string; value: string; label: string; timestamp: string }>;
    unresolved_fields?: string[];
  };
}

// ─── Convert ElevenLabs client-tool format → OpenAI function-calling format ──
function buildOpenAITools(): any[] {
  return FOREMAN_TOOL_DEFINITIONS.map((t) => ({
    type: "function",
    function: {
      name: t.name,
      description: t.description,
      parameters: {
        type: "object",
        properties: t.parameters.properties || {},
        required: t.parameters.required || [],
      },
    },
  }));
}

const tools = buildOpenAITools();

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
    create_customer: { intent: "create_customer", label: "Create Customer", outputType: "client" },
    get_customer_history: { intent: "customer_history", label: "Customer History", outputType: "info" },
    search_customers: { intent: "search_customers", label: "Search Customers", outputType: "info" },
    record_payment: { intent: "record_payment", label: "Record Payment", outputType: "info" },
    get_week_schedule: { intent: "view_schedule", label: "Week Schedule", outputType: "info" },
    get_monthly_summary: { intent: "briefing", label: "Monthly Summary", outputType: "info" },
    get_financial_summary: { intent: "briefing", label: "Financial Summary", outputType: "info" },
    get_outstanding_balance: { intent: "briefing", label: "Outstanding Balance", outputType: "info" },
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
      customer_name: "Customer",
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
      display_number: "Invoice",
      date: "Date",
      query: "Search",
      job_description: "Job Type",
    };
    for (const [key, value] of Object.entries(params)) {
      if (key === "items") continue;
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
      create_invoice: ["Searching customer", "Creating draft invoice", "Adding line items", "Calculating totals", "Saving invoice"],
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

  const recordCreators = ["create_quote", "create_invoice", "create_invoice_from_template", "use_template_for_quote", "create_job"];
  if (recordCreators.includes(name)) {
    let params: any = {};
    try { params = JSON.parse(toolCalls[0].function.arguments || "{}"); } catch {}
    const clientLabel = params.client_name || params.customer_name ? ` for ${params.client_name || params.customer_name}` : "";
    const actionLabels: Record<string, string> = {
      create_quote: "Create Quote",
      create_invoice: "Create Invoice",
      create_invoice_from_template: "Create Invoice",
      use_template_for_quote: "Create Quote",
      create_job: "Schedule Job",
    };
    return {
      id: crypto.randomUUID(),
      message: `This will ${actionLabels[name]?.toLowerCase() || "create a record"}${clientLabel} as a draft. Ready to proceed?`,
      risk_level: "medium",
      actions: [
        { label: actionLabels[name] || "Confirm", action: "confirm", variant: "default" },
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

  const isWrite = ["create_quote", "create_invoice", "use_template_for_quote", "create_invoice_from_template", "create_job", "log_expense"].includes(name);
  
  if (!isWrite) return null;

  const quickActions = [
    { label: "Edit", action: "edit", variant: "outline" as const },
    { label: "Save Draft", action: "save_draft", variant: "default" as const },
  ];

  const previewData: Record<string, string> = {};
  const clientName = params.client_name || params.customer_name;
  if (clientName) previewData["Customer"] = clientName;
  if (params.template_name) previewData["Template"] = params.template_name;
  if (params.job_title) previewData["Job"] = params.job_title;
  if (params.scheduled_date) previewData["Date"] = params.scheduled_date;
  if (params.scheduled_time) previewData["Time"] = params.scheduled_time;
  if (params.notes) previewData["Notes"] = params.notes;
  if (params.tax_rate !== undefined) previewData["Tax Rate"] = `${params.tax_rate}%`;
  if (params.vendor_name) previewData["Vendor"] = params.vendor_name;
  if (params.category) previewData["Category"] = params.category;

  if (Array.isArray(params.items) && params.items.length > 0) {
    previewData["Items"] = `${params.items.length} line item${params.items.length > 1 ? "s" : ""}`;
    const subtotal = params.items.reduce((sum: number, it: any) => sum + (it.quantity || 1) * (it.unit_price || 0), 0);
    previewData["Subtotal"] = `€${subtotal.toLocaleString("en-IE", { minimumFractionDigits: 2 })}`;
    if (params.tax_rate) {
      const tax = subtotal * (params.tax_rate / 100);
      previewData["Tax"] = `€${tax.toLocaleString("en-IE", { minimumFractionDigits: 2 })}`;
      previewData["Total"] = `€${(subtotal + tax).toLocaleString("en-IE", { minimumFractionDigits: 2 })}`;
    } else {
      previewData["Total"] = `€${subtotal.toLocaleString("en-IE", { minimumFractionDigits: 2 })}`;
    }
  }

  if (params.amount) previewData["Amount"] = `€${Number(params.amount).toLocaleString("en-IE", { minimumFractionDigits: 2 })}`;
  if (result?.display_number) previewData["Quote #"] = result.display_number;
  if (result?.display_number) previewData["Invoice #"] = result.display_number;
  if (params.estimated_value) previewData["Est. Value"] = `€${Number(params.estimated_value).toLocaleString("en-IE", { minimumFractionDigits: 2 })}`;

  return {
    type: intent.outputType,
    title: result?.message || `${intent.label} completed`,
    summary: result?.display_number || result?.job_id 
      ? `Draft record created successfully` 
      : undefined,
    record_id: result?.quote_id || result?.invoice_id || result?.job_id || result?.expense_id,
    record_number: result?.display_number,
    preview_data: Object.keys(previewData).length > 0 ? previewData : undefined,
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

  const clientName = params.client_name || params.customer_name;
  if (clientName) {
    memory.current_customer = { 
      id: result?.customer_id || "", 
      name: clientName,
    };
  }
  if (result?.quote_id) {
    memory.current_quote = { id: result.quote_id, number: result.display_number || "" };
  }
  if (result?.invoice_id) {
    memory.current_invoice = { id: result.invoice_id, number: result.display_number || "" };
  }
  if (result?.job_id && params.job_title) {
    memory.current_job = { id: result.job_id, title: params.job_title };
  }

  return memory;
}

// ─── AI CONVERSATIONS LOGGING (fire-and-forget) ────────────────────
function logToAiConversations(
  supabase: any,
  userId: string,
  userMessage: string,
  assistantMessage: string,
  metadata: Record<string, any>,
  tokensUsed?: number
) {
  supabase.from("ai_conversations").insert([
    { user_id: userId, role: "user", content: userMessage, metadata },
    { user_id: userId, role: "assistant", content: assistantMessage, metadata, tokens_used: tokensUsed },
  ]).then(({ error }: any) => {
    if (error) console.error("ai_conversations log error (non-fatal):", error);
  });
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

    // ─── PARALLEL: Auth + Profile ───────────────────────────────
    const { message, conversation_id, memory_context, stream: streamRequested }: ChatRequest = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parallelise: auth + profile fetch
    const [authResult, profileResult] = await Promise.all([
      userSupabase.auth.getUser(),
      // We need userId for profile, but we can start with the token
      // Actually we need to auth first. Let's just auth then parallel the rest.
      Promise.resolve(null),
    ]);

    const { data: { user }, error: authError } = authResult;
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    // ─── PARALLEL: Profile + Membership + Preferences ───────────
    const [profileRes, membershipRes, prefsRes] = await Promise.all([
      serviceSupabase.from("profiles").select("team_id, full_name, trade_type, currency").eq("id", userId).single(),
      serviceSupabase.from("team_memberships").select("id").eq("user_id", userId).limit(1).maybeSingle(),
      serviceSupabase.from("foreman_ai_preferences").select("*").eq("user_id", userId).maybeSingle(),
    ]);

    if (!profileRes.data?.team_id) {
      return new Response(
        JSON.stringify({ error: "User not in a team" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const teamId = profileRes.data.team_id;
    const userName = profileRes.data.full_name || "there";
    const userTradeType = profileRes.data.trade_type || null;
    const userCurrency = profileRes.data.currency || "EUR";
    const userPrefs = prefsRes.data;

    if (!membershipRes.data) {
      return new Response(
        JSON.stringify({ error: "Not a team member" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── QUICK-ACTION SHORT-CIRCUIT ─────────────────────────────
    const quickActionShortCircuits: Record<string, { intent: string; label: string; response: string }> = {
      "Help me create a new quote": {
        intent: "create_quote",
        label: "Create Quote",
        response: "Sure! To create a quote, I'll need a few details:\n\n1. **Customer name** — who is this for?\n2. **Job description** — what work are you quoting?\n3. **Line items** — materials, labour, etc. with prices\n\nYou can give me all the details at once, e.g.:\n> *\"Quote for John Murphy, EV charger install, €800 labour, €400 materials\"*",
      },
      "I need to log an expense": {
        intent: "log_expense",
        label: "Log Expense",
        response: "No problem! Tell me the details:\n\n1. **Vendor/supplier** — where did you spend?\n2. **Amount** — how much?\n3. **Category** — materials, fuel, tools, labour, permits, or other\n\nFor example:\n> *\"€85 at Screwfix for materials\"*",
      },
      "Help me create a new invoice": {
        intent: "create_invoice",
        label: "Create Invoice",
        response: "Sure! I'll need:\n\n1. **Customer name** — who is this for?\n2. **Line items** — description, quantity, and price for each\n3. **Any notes** — payment terms, references, etc.\n\nFor example:\n> *\"Invoice John Murphy for boiler service €250\"*",
      },
    };

    // ─── DIRECT WEBHOOK SHORT-CIRCUITS (skip AI entirely) ──────
    const directWebhookActions: Record<string, { function_name: string; parameters: Record<string, any>; intent: string; label: string }> = {
      "What jobs do I have scheduled for today?": { function_name: "get_todays_jobs", parameters: {}, intent: "view_schedule", label: "Today's Schedule" },
      "Which invoices are overdue?": { function_name: "get_overdue_invoices", parameters: {}, intent: "overdue", label: "Overdue Invoices" },
      "Give me a summary of my week ahead": { function_name: "get_week_ahead_summary", parameters: {}, intent: "briefing", label: "Week Ahead" },
      "Show me my draft quotes that need to be sent.": { function_name: "get_todays_jobs", parameters: {}, intent: "view_schedule", label: "Draft Quotes" },
    };

    const directAction = directWebhookActions[message];
    if (directAction) {
      const actionId = crypto.randomUUID();
      let activeConvId = conversation_id;
      if (!activeConvId) {
        const { data: newConv } = await serviceSupabase
          .from("george_conversations")
          .insert({ team_id: teamId, user_id: userId, title: message.slice(0, 50) })
          .select("id")
          .single();
        if (newConv) activeConvId = newConv.id;
      }

      // Call webhook directly — no AI needed
      const webhookRes = await fetch(`${supabaseUrl}/functions/v1/george-webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authHeader },
        body: JSON.stringify({ function_name: directAction.function_name, parameters: directAction.parameters }),
      });
      const webhookData = await webhookRes.json();
      const responseMsg = webhookData.message || webhookData.error || "No data found.";

      // Persist messages (fire and forget)
      if (activeConvId) {
        serviceSupabase.from("george_messages").insert([
          { conversation_id: activeConvId, role: "user", content: message },
          { conversation_id: activeConvId, role: "assistant", content: responseMsg },
        ]);
      }

      // Log to ai_conversations
      logToAiConversations(serviceSupabase, userId, message, responseMsg, {
        conversation_id: activeConvId, team_id: teamId, intent: directAction.intent, model: "webhook-shortcircuit",
      });

      return new Response(
        JSON.stringify({
          message: responseMsg,
          conversation_id: activeConvId,
          action_plan: null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const shortCircuit = quickActionShortCircuits[message];
    if (shortCircuit) {
      const actionId = crypto.randomUUID();
      let activeConversationId = conversation_id;
      if (!activeConversationId) {
        const { data: newConv } = await serviceSupabase
          .from("george_conversations")
          .insert({ team_id: teamId, user_id: userId, title: message.slice(0, 50) })
          .select("id")
          .single();
        if (newConv) activeConversationId = newConv.id;
      }
      // Fire and forget
      if (activeConversationId) {
        serviceSupabase.from("george_messages").insert([
          { conversation_id: activeConversationId, role: "user", content: message },
          { conversation_id: activeConversationId, role: "assistant", content: shortCircuit.response },
        ]);
      }
      // Log to ai_conversations
      logToAiConversations(serviceSupabase, userId, message, shortCircuit.response, {
        conversation_id: activeConversationId, team_id: teamId, intent: shortCircuit.intent, model: "quick-action-shortcircuit",
      });
      return new Response(
        JSON.stringify({
          message: shortCircuit.response,
          conversation_id: activeConversationId,
          action_plan: {
            action_id: actionId,
            status: "completed",
            input_source: "typed",
            command_text: message,
            timestamp: new Date().toISOString(),
            intent: shortCircuit.intent,
            intent_label: shortCircuit.label,
            entities: [],
            steps: [{ id: "ready", label: "Ready for details", status: "complete", completed_at: new Date().toISOString() }],
            text_response: shortCircuit.response,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("george-chat: Processing message:", message);

    // ─── PARALLEL: Conversation + History ─────────────────────────
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

    // Save user message + fetch history in parallel
    const [, historyResult] = await Promise.all([
      activeConversationId
        ? serviceSupabase.from("george_messages").insert({ conversation_id: activeConversationId, role: "user", content: message })
        : Promise.resolve(null),
      activeConversationId
        ? serviceSupabase.from("george_messages").select("role, content").eq("conversation_id", activeConversationId).order("created_at", { ascending: true }).limit(20)
        : Promise.resolve({ data: [] }),
    ]);

    const history: { role: string; content: string }[] = ((historyResult as any)?.data || []).slice(0, -1);

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
      if (memory_context.current_customer) {
        parts.push(`Current customer: ${memory_context.current_customer.name} (id: ${memory_context.current_customer.id})`);
      }
      if (memory_context.current_job) {
        parts.push(`Current job: ${memory_context.current_job.title} (id: ${memory_context.current_job.id})`);
      }
      if (memory_context.current_quote) {
        parts.push(`Current quote: ${memory_context.current_quote.number} (id: ${memory_context.current_quote.id})`);
      }
      if (memory_context.current_invoice) {
        parts.push(`Current invoice: ${memory_context.current_invoice.number} (id: ${memory_context.current_invoice.id})`);
      }
      if (memory_context.session_entities?.length) {
        parts.push(`\nRecent session references:`);
        for (const entity of memory_context.session_entities) {
          parts.push(`  - ${entity.label}: ${entity.value}`);
        }
      }
      if (parts.length > 0) {
        memoryPrompt = `\n\nACTIVE CONTEXT (from current session):\n${parts.join("\n")}\nUse this context when the user says "same customer", "that quote", "the same description", "make it X", etc.
When resolving an ambiguous follow-up using context, mention which context you used in your response (e.g. "Using your current draft quote...").
If there are multiple possible matches and you're unsure, ASK a compact clarifying question instead of guessing.`;
      }
    }

    // ─── PREFERENCES PROMPT ──────────────────────────────────────
    let preferencesPrompt = "";
    if (userPrefs) {
      const prefParts: string[] = [];
      if (userPrefs.always_create_drafts) prefParts.push("- ALWAYS create records as drafts, never send automatically");
      if (userPrefs.require_confirmation_before_send) prefParts.push("- Show a confirmation gate before any client-facing communication");
      if (userPrefs.itemised_format) prefParts.push("- Use itemised line-item format for quotes and invoices");
      if (userPrefs.labour_materials_split) prefParts.push("- Split labour and materials costs separately on quotes/invoices");
      if (userPrefs.default_payment_terms_days) prefParts.push(`- Default payment terms: ${userPrefs.default_payment_terms_days} days`);
      if (userPrefs.default_tax_rate != null) prefParts.push(`- Default tax rate: ${userPrefs.default_tax_rate}%`);
      if (prefParts.length > 0) {
        preferencesPrompt = `\n\nUSER PREFERENCES:\n${prefParts.join("\n")}`;
      }
    }

    // ─── TRADE-SPECIFIC CONTEXT ─────────────────────────────────
    // Currency symbol for pricing context
    const currSymbols: Record<string, string> = { EUR: "€", GBP: "£", USD: "$", AUD: "A$", CAD: "C$", NZD: "NZ$" };
    const cs = currSymbols[userCurrency] || userCurrency + " ";

    // Country/region context based on currency
    const regionContext: Record<string, string> = {
      EUR: "Ireland. Standards: Irish Building Regs, SEAI, CRO. VAT: 23% standard, 13.5% reduced, 9% hospitality, 0% exempt. Date format: dd/MM/yyyy.",
      GBP: "United Kingdom. Standards: UK Building Regs, HSE, HMRC. VAT: 20% standard. Date format: dd/MM/yyyy.",
      USD: "United States. Standards: NEC, OSHA, IBC, state licensing. Sales tax varies by state. Date format: MM/dd/yyyy.",
      AUD: "Australia. Standards: AS/NZS, state licensing boards. GST: 10%. Date format: dd/MM/yyyy.",
      CAD: "Canada. Standards: CEC, provincial licensing. GST/HST varies by province. Date format: dd/MM/yyyy.",
      NZD: "New Zealand. Standards: AS/NZS, EWRB, PGDB. GST: 15%. Date format: dd/MM/yyyy.",
    };
    const region = regionContext[userCurrency] || `Currency: ${userCurrency}. Adapt standards and pricing to the user's region.`;

    const tradeContextMap: Record<string, string> = {
      "Electrician": `TRADE EXPERTISE — ELECTRICIAN:
Expert in electrical contracting.
- Standards: BS 7671 (IET Wiring Regs), IS 10101 (Ireland), Part P (England/Wales), NEC (US), AS/NZS 3000 (AU/NZ), CEC (Canada)
- Certifications: RECI (Ireland), NICEIC/NAPIT (UK), Safe Electric, EICRs, state licensing (US/AU/CA)
- Jobs: CU upgrades, rewires, EV charger installs (IEC 61851), fire alarm systems, PAT testing, socket/lighting circuits, 3-phase commercial, data cabling, solar PV wiring
- Materials: MCBs, RCBOs, cable sizing (T&E, SWA, flex, NM-B/Romex), containment, trunking, conduit
- Pricing: Domestic ${cs}40-65/hr, commercial ${cs}55-85/hr. CU upgrade ${cs}800-1,500. Full rewire 3-bed ${cs}4,000-7,000. EV charger install ${cs}800-1,800
- Compliance: Cert of completion for notifiable work. Periodic inspection reports. Emergency lighting regs`,

      "Plumber": `TRADE EXPERTISE — PLUMBER:
Expert in plumbing and heating.
- Standards: Gas Safe (UK), RGII (Ireland), Water Regs, Part G/H, UPC/IPC (US), AS/NZS 3500 (AU/NZ)
- Certifications: Gas Safe card, OFTEC (oil), Unvented G3, LPG, state plumbing license (US/AU/CA)
- Jobs: Boiler installs/servicing, cylinder replacements, bathroom fits, underfloor heating, radiator installs, leak repairs, power flushing, water treatment, backflow prevention
- Materials: Copper (15mm/22mm/28mm), PEX, solvent weld, compression fittings, flue systems, pumps, valves
- Pricing: ${cs}45-70/hr. Boiler install ${cs}2,500-4,500. Bathroom refit ${cs}5,000-12,000. Power flush ${cs}400-600
- Compliance: Gas safety certs, landlord gas safety records, commissioning checklists, benchmark log`,

      "HVAC Technician": `TRADE EXPERTISE — HVAC:
Expert in heating, ventilation, and air conditioning.
- Standards: F-Gas (EU 517/2014), Part L, BER (Ireland), EPC (UK), EPA 608 (US), ARCtick (AU)
- Certifications: F-Gas cert, SEAI registered, MCS (UK), RefCom, HVAC license (US/AU/CA)
- Jobs: Heat pump installs, AC installs, ventilation/MVHR, duct work, refrigeration, commissioning, split systems
- Materials: Refrigerants (R32, R410A, R290), copper lines, condensate pumps, ductwork, diffusers, BMS
- Pricing: AC install ${cs}1,500-3,500. Heat pump system ${cs}8,000-16,000. MVHR ${cs}4,000-8,000. Service ${cs}80-150
- Compliance: F-Gas log books, commissioning certs, refrigerant leak checks, energy performance`,

      "Carpenter": `TRADE EXPERTISE — CARPENTER/JOINER:
Expert in carpentry and joinery.
- Standards: Building Regs Parts A/B/K, fire door regs, structural timber standards, IRC (US), NCC (AU)
- Jobs: First/second fix, kitchens, staircases, timber frame, roofing, decking, bespoke furniture, fire doors, skirting/architrave, framing
- Materials: Softwood/hardwood, MDF, plywood, OSB, ironmongery, adhesives, fixings
- Pricing: Day rate ${cs}250-400. Kitchen fit ${cs}2,000-5,000 labour. Staircase ${cs}1,500-4,000. Decking ${cs}80-120/m²`,

      "Painter & Decorator": `TRADE EXPERTISE — PAINTER & DECORATOR:
Expert in painting and decorating.
- Jobs: Interior/exterior painting, wallpapering, spraying, commercial decoration, protective coatings, lime wash, heritage restoration
- Materials: Emulsion, gloss, satinwood, primers, fillers, wallpaper paste, masking, spray equipment
- Pricing: Day rate ${cs}200-350. Room repaint ${cs}300-600. Exterior 3-bed ${cs}2,000-4,000. Wallpapering ${cs}200-400/room`,

      "Roofer": `TRADE EXPERTISE — ROOFER:
Expert in roofing.
- Standards: BS 5534, Part C, NRCA (US), flat roof standards
- Jobs: Re-roofing, flat roofs (felt/EPDM/GRP/TPO), guttering, fascia/soffit, lead work, chimney repairs, skylights/Velux
- Materials: Tiles (concrete/clay/slate), felt, EPDM, GRP, lead, zinc, battens, breathable membrane, flashing
- Pricing: Full re-roof 3-bed ${cs}6,000-12,000. Flat roof ${cs}80-120/m². Gutter replacement ${cs}500-1,200`,

      "Landscaper": `TRADE EXPERTISE — LANDSCAPER:
Expert in landscaping and groundworks.
- Jobs: Garden design, paving/patios, fencing, turfing, planting, drainage, artificial grass, retaining walls, water features, irrigation
- Materials: Block paving, natural stone, sleepers, aggregate, topsoil, membrane, timber fencing, composite decking
- Pricing: Patio ${cs}60-120/m². Fencing ${cs}60-100/m. Artificial grass ${cs}50-80/m². Design + build ${cs}5,000-20,000`,

      "Builder / General Contractor": `TRADE EXPERTISE — GENERAL BUILDER/CONTRACTOR:
Expert in general construction.
- Standards: Building Regs (all parts), planning permission, structural engineer specs, IRC/IBC (US), NCC (AU)
- Jobs: Extensions, renovations, conversions (attic/garage), new builds, structural alterations, groundworks, demolition
- Materials: Blocks, bricks, concrete, steel, timber, insulation, DPC, lintels
- Pricing: Extension ${cs}1,500-2,500/m². Attic conversion ${cs}15,000-35,000. Garage conversion ${cs}8,000-15,000`,

      "Locksmith": `TRADE EXPERTISE — LOCKSMITH:
Expert in security and access. Lock upgrades, emergency access, master key systems, access control, CCTV, safe work, UPVC mechanisms, BS 3621 locks, smart locks, keyless entry.
- Pricing: Emergency callout ${cs}80-150. Lock change ${cs}60-120. Master key system from ${cs}500. Smart lock install ${cs}200-500`,

      "Handyman": `TRADE EXPERTISE — HANDYMAN/PROPERTY MAINTENANCE:
Multi-trade small works. Shelving, flat-pack, minor plumbing/electrical, tiling, painting, door hanging, blind fitting, gutter cleaning, pressure washing.
- Pricing: Hourly ${cs}35-55. Half day ${cs}150-250. Full day ${cs}250-400`,

      "Cleaning Services": `TRADE EXPERTISE — CLEANING SERVICES:
Expert in residential and commercial cleaning. Deep cleans, end-of-tenancy, carpet cleaning, window cleaning, pressure washing, office cleaning, post-construction cleans.
- Pricing: Hourly ${cs}25-45. End of tenancy ${cs}200-500. Deep clean 3-bed ${cs}250-450. Office ${cs}15-30/hr`,

      "Pest Control": `TRADE EXPERTISE — PEST CONTROL:
Expert in pest management. Rodent control, insect treatment, bird proofing, fumigation, wildlife management, BPCA/IPCA standards.
- Pricing: Survey ${cs}50-100. Rodent treatment ${cs}150-300. Wasp nest ${cs}60-120. Commercial contract from ${cs}200/month`,

      "Pool & Spa": `TRADE EXPERTISE — POOL & SPA:
Expert in pool and spa installation/maintenance. Pool builds, liner replacements, pump/filter systems, chemical balancing, heating, covers, spa installs.
- Pricing: Pool maintenance ${cs}100-200/month. Pump replacement ${cs}400-800. New pool build from ${cs}25,000`,

      "Pressure Washing": `TRADE EXPERTISE — PRESSURE WASHING:
Expert in exterior cleaning. Driveways, patios, decking, render cleaning, roof cleaning, graffiti removal, fleet washing.
- Pricing: Driveway ${cs}150-400. Patio ${cs}100-300. Full house render ${cs}400-800. Roof cleaning ${cs}300-600`,

      "Fencing": `TRADE EXPERTISE — FENCING:
Expert in fencing and gates. Timber fencing, metal railings, colorbond (AU/NZ), post and rail, security fencing, automated gates.
- Pricing: Panel fencing ${cs}60-100/m. Post and rail ${cs}40-70/m. Automated gate from ${cs}2,000`,

      "Appliance Repair": `TRADE EXPERTISE — APPLIANCE REPAIR:
Expert in domestic/commercial appliance repair. Washing machines, dishwashers, ovens, fridges, dryers, commercial catering equipment.
- Pricing: Callout + diagnosis ${cs}50-80. Standard repair ${cs}80-200. Parts additional`,

      "Auto Detailing": `TRADE EXPERTISE — AUTO DETAILING:
Expert in vehicle detailing. Interior/exterior detailing, paint correction, ceramic coating, PPF, upholstery cleaning, fleet services.
- Pricing: Full detail ${cs}150-400. Paint correction ${cs}300-600. Ceramic coating ${cs}400-1,200`,

      "Garage Door Services": `TRADE EXPERTISE — GARAGE DOOR SERVICES:
Expert in garage door installation and repair. Sectional, roller, side-hinged, up-and-over, automation, spring replacement, motor installs.
- Pricing: New door supply + fit ${cs}800-2,500. Motor install ${cs}300-600. Spring replacement ${cs}150-300`,

      "Tree Services": `TRADE EXPERTISE — TREE SERVICES/ARBORIST:
Expert in tree surgery. Tree felling, pruning, stump grinding, hedge trimming, site clearance, TPO awareness, tree surveys.
- Pricing: Tree felling ${cs}300-2,000+. Stump grinding ${cs}100-300. Hedge trimming ${cs}150-400. Tree survey ${cs}200-500`,

      "Restoration": `TRADE EXPERTISE — RESTORATION:
Expert in property restoration. Fire/flood damage, damp treatment, structural repair, heritage restoration, mould remediation, insurance work.
- Pricing: Damp treatment ${cs}500-3,000. Flood restoration from ${cs}2,000. Heritage work quoted per project`,

      "Solar": `TRADE EXPERTISE — SOLAR:
Expert in solar PV and renewable energy.
- Standards: SEAI grants (Ireland), MCS (UK), CEC (AU), DNO/grid applications, NEC 690 (US)
- Jobs: PV panel installs, inverters, battery storage (Tesla Powerwall, etc.), roof assessment, EPC/BER impact, commercial arrays
- Pricing: 3kW system ${cs}4,000-6,000. Battery ${cs}3,000-5,000. Commercial from ${cs}15,000`,

      "Flooring": `TRADE EXPERTISE — FLOORING:
Expert in floor installation. Hardwood, engineered wood, LVT, laminate, carpet, vinyl, subfloor prep, underlay, transitions, sanding/refinishing.
- Pricing: LVT ${cs}40-70/m² fitted. Engineered wood ${cs}50-90/m². Carpet ${cs}25-50/m². Sanding ${cs}20-35/m²`,

      "Tiler": `TRADE EXPERTISE — TILER:
Expert in wall and floor tiling. Waterproofing (tanking), underfloor heating prep, natural stone, large format, mosaics, wet rooms, swimming pools.
- Materials: Adhesive, grout, backer board, tanking membrane, trims, levelling systems
- Pricing: ${cs}40-80/m² supply + fit. Bathroom tiling ${cs}800-2,000. Wet room ${cs}1,500-3,000`,

      "Property Maintenance": `TRADE EXPERTISE — PROPERTY MAINTENANCE:
Expert in multi-trade property management. Landlord services, planned maintenance, reactive repairs, void turnarounds, compliance checks, facilities management.
- Pricing: Hourly ${cs}35-55. Void turnaround ${cs}1,000-3,000. Maintenance contract from ${cs}200/month`,

      "Concrete & Masonry": `TRADE EXPERTISE — CONCRETE & MASONRY:
Expert in concrete and masonry work. Foundations, slabs, block laying, brickwork, pointing, rendering, polished concrete, retaining walls.
- Pricing: Foundations ${cs}100-150/m³. Block laying ${cs}40-60/m². Rendering ${cs}30-50/m². Polished concrete ${cs}80-150/m²`,

      "Window & Door Installation": `TRADE EXPERTISE — WINDOW & DOOR INSTALLATION:
Expert in fenestration. UPVC, aluminium, timber windows/doors, composite doors, bi-folds, sliding doors, roof windows, FENSA/Certass (UK), SEAI grants.
- Pricing: Window replacement ${cs}400-800 each. Composite front door ${cs}1,200-2,500. Bi-fold doors ${cs}3,000-8,000`,
    };

    const tradeContext = userTradeType ? (tradeContextMap[userTradeType] || `TRADE: ${userTradeType}. Provide advice relevant to this trade sector.`) : "";

    const systemPrompt = `You are Foreman AI — the no-nonsense operations brain behind Foreman, an AI operating system for trade businesses.

PERSONALITY:
- You're direct, sharp, and trade-savvy. Think experienced Irish site foreman who's seen it all.
- Keep responses SHORT and decision-focused. No waffle. No corporate AI phrasing.
- NEVER say "certainly", "absolutely", "I'd be happy to", "great question", or "of course". Just do the thing.
- Use "right", "grand", "sorted", "done" naturally but don't overdo the dialect.
- Format responses with markdown: use **bold** for key numbers/names, bullet points for lists, and line breaks for readability.

RESPONSE FRAMEWORK — every response must follow:
1. **Insight** — what's happening (the data/fact)
2. **Impact** — why it matters (the business consequence)
3. **Action** — what to do next (the recommendation or executed action)
Skip steps that don't apply (e.g. simple lookups just need Insight + Action).

REGION: ${region}

CRITICAL DATE CONTEXT:
- TODAY: ${today} (${dayOfWeek}), YEAR: ${year}
- Tomorrow: ${tomorrow.toISOString().split("T")[0]}
- Next week: ${nextWeek.toISOString().split("T")[0]}
User's name: ${userName}
Currency: ${userCurrency} (${cs})

${tradeContext}

IMPORTANT RULES:
1. ALWAYS use ${year} as the year unless explicitly told otherwise.
2. "Tomorrow" = ${tomorrow.toISOString().split("T")[0]}. "Next week" = ${nextWeek.toISOString().split("T")[0]}.
3. NEVER automatically send anything to clients. All quotes, invoices, and reminders are created as DRAFTS.
4. When creating records, ALWAYS mention they are saved as drafts and the user can review/send them manually.
5. Use tools to actually perform actions — don't just describe what you would do.
6. When a job type is mentioned, proactively suggest a relevant template.
7. Use the user's currency (${cs}) for ALL monetary values.
8. Be concise and trade-aware. Get to the point fast.
9. When users ask for trade advice, pricing guidance, or compliance questions, give specific, actionable answers grounded in your trade expertise and regional standards.
10. Always reference relevant standards, regulations, and certifications for the user's trade and region.
11. If you spot a risk or opportunity in the data, flag it proactively — don't wait to be asked.${memoryPrompt}${preferencesPrompt}`;

    // ─── AI CALL ──────────────────────────────────────────────────
    const actionId = crypto.randomUUID();

    if (!lovableApiKey) {
      const fallbackMsg = "I can help you check today's jobs, create quotes, log expenses, or chase overdue invoices. What would you like to do?";
      // Fire and forget
      if (activeConversationId) {
        serviceSupabase.from("george_messages").insert({
          conversation_id: activeConversationId, role: "assistant", content: fallbackMsg,
        });
      }
      logToAiConversations(serviceSupabase, userId, message, fallbackMsg, {
        conversation_id: activeConversationId, team_id: teamId, intent: "chat", model: "no-api-key-fallback",
      });
      return new Response(
        JSON.stringify({
          message: fallbackMsg,
          conversation_id: activeConversationId,
          action_plan: null,
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

    // ─── STREAMING-FIRST AI CALL ──────────────────────────────────
    // Always call with stream:true. If no tool calls, pipe SSE to client.
    // If tool calls, buffer and handle as before.
    let aiData: any;
    let streamResponse: Response | null = null;
    
    try {
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${lovableApiKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: aiMessages,
          tools,
          tool_choice: "auto",
          temperature: 0.7,
          max_tokens: 1000,
          stream: true,
        }),
      });

      if (!aiResponse.ok) {
        if (aiResponse.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (aiResponse.status === 402) {
          return new Response(
            JSON.stringify({ error: "AI usage limit reached. Please add credits." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const errorText = await aiResponse.text();
        console.error("AI request failed:", errorText);
        throw new Error("AI request failed");
      }

      // Read the SSE stream to detect tool calls vs pure text
      const reader = aiResponse.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let collectedContent = "";
      let collectedToolCalls: any[] = [];
      let toolCallBuffers: Record<number, { id: string; name: string; arguments: string }> = {};
      let finishReason = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const chunk = JSON.parse(jsonStr);
            const delta = chunk.choices?.[0]?.delta;
            if (delta?.content) collectedContent += delta.content;
            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                const idx = tc.index ?? 0;
                if (!toolCallBuffers[idx]) {
                  toolCallBuffers[idx] = { id: tc.id || "", name: tc.function?.name || "", arguments: "" };
                }
                if (tc.id) toolCallBuffers[idx].id = tc.id;
                if (tc.function?.name) toolCallBuffers[idx].name = tc.function.name;
                if (tc.function?.arguments) toolCallBuffers[idx].arguments += tc.function.arguments;
              }
            }
            if (chunk.choices?.[0]?.finish_reason) {
              finishReason = chunk.choices[0].finish_reason;
            }
          } catch { /* partial JSON, ignore */ }
        }
      }

      // Build tool calls array from buffers
      collectedToolCalls = Object.values(toolCallBuffers).filter(tc => tc.name).map(tc => ({
        id: tc.id,
        type: "function",
        function: { name: tc.name, arguments: tc.arguments },
      }));

      const hasToolCalls = collectedToolCalls.length > 0;

      // ─── PURE CHAT + STREAMING → pipe as SSE ────────────────────
      if (!hasToolCalls && streamRequested && collectedContent) {
        // Save assistant message (fire and forget)
        if (activeConversationId) {
          serviceSupabase.from("george_messages").insert({
            conversation_id: activeConversationId, role: "assistant", content: collectedContent,
          });
          serviceSupabase.from("george_conversations")
            .update({ updated_at: now.toISOString() })
            .eq("id", activeConversationId);
        }

        // Build SSE response from collected content — send in small chunks for typewriter effect
        const encoder = new TextEncoder();
        const sseChunks: string[] = [];

        // Send conversation_id as first event
        sseChunks.push(`data: ${JSON.stringify({ conversation_id: activeConversationId })}\n\n`);

        // Split content into word-sized chunks for natural streaming
        const words = collectedContent.split(/(\s+)/);
        for (let i = 0; i < words.length; i++) {
          const chunk = {
            choices: [{ delta: { content: words[i] }, index: 0, finish_reason: i === words.length - 1 ? "stop" : null }],
          };
          sseChunks.push(`data: ${JSON.stringify(chunk)}\n\n`);
        }
        sseChunks.push("data: [DONE]\n\n");

        const sseBody = sseChunks.join("");
        // Log to ai_conversations
        logToAiConversations(serviceSupabase, userId, message, collectedContent, {
          conversation_id: activeConversationId, team_id: teamId, intent: "chat", model: "google/gemini-2.5-pro",
        });
        return new Response(encoder.encode(sseBody), {
          headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
        });
      }

      // ─── Build aiData for tool-call or non-streaming path ───────
      aiData = {
        choices: [{
          message: {
            role: "assistant",
            content: collectedContent || null,
            tool_calls: hasToolCalls ? collectedToolCalls : undefined,
          },
          finish_reason: finishReason,
        }],
      };
    } catch (aiErr) {
      console.error("george-chat: AI call failed:", aiErr);
      const fallbackMsg = "I'm having trouble right now. You can still use the app normally — please try again in a minute.";
      // Fire and forget
      if (activeConversationId) {
        serviceSupabase.from("george_messages").insert({
          conversation_id: activeConversationId, role: "assistant", content: fallbackMsg,
        });
        serviceSupabase.from("george_conversations")
          .update({ updated_at: now.toISOString() })
          .eq("id", activeConversationId);
      }
      logToAiConversations(serviceSupabase, userId, message, fallbackMsg, {
        conversation_id: activeConversationId, team_id: teamId, intent: "chat", model: "ai-error-fallback",
      });
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
    const recordCreators = ["create_quote", "create_invoice", "create_invoice_from_template", "use_template_for_quote", "create_job", "log_expense", "send_invoice_reminder"];
    const pendingToolCalls: Array<{ function_name: string; parameters: any }> = [];
    let deferredExecution = false;

    if (toolCalls.length > 0) {
      for (const toolCall of toolCalls) {
        const functionName = toolCall.function.name;
        let parameters = {};
        try { parameters = JSON.parse(toolCall.function.arguments || "{}"); } catch {}

        if (recordCreators.includes(functionName)) {
          console.log(`george-chat: Deferring ${functionName} — requires confirmation`);
          pendingToolCalls.push({ function_name: functionName, parameters });
          toolResults.push({ name: functionName, result: { message: `Action prepared — waiting for your confirmation before saving to the system. DO NOT tell the user this has been saved or created yet.`, deferred: true } });
          deferredExecution = true;
        } else {
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
      }

      // For deferred (confirmation-gated) actions, skip the expensive second AI call
      if (deferredExecution) {
        finalMessage = "I've prepared everything — please review and confirm below to save.";
      } else {
        // Follow-up AI call with tool results for executed actions
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
              model: "google/gemini-2.5-flash",
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
      }
    } else {
      finalMessage = choice?.message?.content || "I'm here to help you manage your business. What would you like to do?";
    }

    // ─── PERSIST RESPONSE (fire and forget) ───────────────────────
    if (activeConversationId) {
      serviceSupabase.from("george_messages").insert({
        conversation_id: activeConversationId, role: "assistant", content: finalMessage,
      });
      serviceSupabase.from("george_conversations")
        .update({ updated_at: now.toISOString() })
        .eq("id", activeConversationId);
    }

    // ─── BUILD STRUCTURED ACTION PLAN ─────────────────────────────
    const intentInfo = classifyIntent(toolCalls);
    const hasAction = toolCalls.length > 0;

    // Change 5: For pure chat (no tools called), return action_plan: null
    if (!hasAction) {
      // Log pure chat to ai_conversations
      logToAiConversations(serviceSupabase, userId, message, finalMessage, {
        conversation_id: activeConversationId, team_id: teamId, intent: "chat", model: "google/gemini-2.5-pro",
      });
      return new Response(
        JSON.stringify({
          message: finalMessage,
          conversation_id: activeConversationId,
          action_plan: null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const entities = extractEntities(toolCalls);
    const steps = buildActionSteps(toolCalls, toolResults);
    const confirmation = needsConfirmation(toolCalls);
    const output = buildOutput(intentInfo, toolCalls, toolResults);
    const updatedMemory = buildMemory(toolCalls, toolResults, memory_context);

    const anyFailed = steps.some((s: any) => s.status === "failed");

    const actionPlan: any = {
      action_id: actionId,
      status: deferredExecution ? "needs_confirmation" : (confirmation ? "needs_confirmation" : anyFailed ? "failed" : "completed"),
      input_source: "typed",
      command_text: message,
      timestamp: now.toISOString(),
      intent: intentInfo.intent,
      intent_label: intentInfo.label,
      entities,
      steps: deferredExecution 
        ? steps.map((s: any) => ({ ...s, status: s.status === "complete" ? "complete" : s.status }))
        : steps,
      output: deferredExecution ? buildOutput(intentInfo, toolCalls, toolResults) : output,
      text_response: finalMessage,
      confirmation_gate: deferredExecution ? needsConfirmation(toolCalls) : confirmation,
      pending_tool_calls: deferredExecution ? pendingToolCalls : undefined,
      memory_context: Object.keys(updatedMemory).length > 0 ? updatedMemory : undefined,
      conversation_id: activeConversationId,
    };

    // ─── AUDIT LOG (fire and forget) ──────────────────────────────
    const memoryLog: any = {};
    if (memory_context?.current_customer) memoryLog.customer_context_used = memory_context.current_customer.name;
    if (memory_context?.current_quote) memoryLog.quote_context_used = memory_context.current_quote.number;
    if (memory_context?.current_invoice) memoryLog.invoice_context_used = memory_context.current_invoice.number;
    if (memory_context?.current_job) memoryLog.job_context_used = memory_context.current_job.title;
    if (memory_context?.session_entities?.length) memoryLog.session_entities_available = memory_context.session_entities.length;
    if (userPrefs) memoryLog.preferences_applied = true;

    serviceSupabase.from("ai_action_audit").insert({
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
      memory_resolution_log: Object.keys(memoryLog).length > 0 ? memoryLog : null,
    }).then(({ error }) => {
      if (error) console.error("george-chat: Audit log error (non-fatal):", error);
    });

    // Log tool-call response to ai_conversations
    const toolNames = toolCalls.map((tc: any) => tc.function.name);
    logToAiConversations(serviceSupabase, userId, message, finalMessage, {
      conversation_id: activeConversationId, team_id: teamId, intent: intentInfo.intent,
      model: "google/gemini-2.5-pro", tool_calls: toolNames,
    });

    return new Response(
      JSON.stringify({
        message: finalMessage,
        conversation_id: activeConversationId,
        action_plan: actionPlan,
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
