import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { FOREMAN_TOOL_DEFINITIONS } from "../_shared/foreman-tool-definitions.ts";

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
    const { message, conversation_id, memory_context }: ChatRequest = await req.json();

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
      serviceSupabase.from("profiles").select("team_id, full_name").eq("id", userId).single(),
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

    const systemPrompt = `You are Foreman AI, a professional AI assistant for Foreman — a trade business management platform for electricians, plumbers, and field service professionals in Ireland and the UK.

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
8. Be concise, professional, and trade-aware.${memoryPrompt}${preferencesPrompt}`;

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
      return new Response(
        JSON.stringify({
          message: fallbackMsg,
          conversation_id: activeConversationId,
          // No action_plan for pure chat — renders as plain bubble
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
      // Fire and forget
      if (activeConversationId) {
        serviceSupabase.from("george_messages").insert({
          conversation_id: activeConversationId, role: "assistant", content: fallbackMsg,
        });
        serviceSupabase.from("george_conversations")
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
          if (deferredExecution) {
            finalMessage = "I've prepared everything — please review and confirm below to save.";
          }
        } else {
          finalMessage = toolResults.map((tr) => tr.result.message || `Completed ${tr.name}`).join("\n\n");
        }
      } catch {
        finalMessage = toolResults.map((tr) => tr.result.message || `Completed ${tr.name}`).join("\n\n");
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
