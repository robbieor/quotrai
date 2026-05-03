/**
 * revamo AI — Single source of truth for all ElevenLabs client tool definitions.
 * Used by sync-agent-tools to push to the ElevenLabs PATCH /v1/convai/agents/{agent_id} endpoint.
 *
 * Every tool is type: "client" — executed by the frontend (VoiceAgentContext → george-webhook).
 */

export interface ToolParameter {
  type: string;
  description: string;
  enum?: string[];
  items?: { type: string; properties?: Record<string, ToolParameter>; required?: string[] };
  properties?: Record<string, ToolParameter>;
  required?: string[];
}

export interface ToolDefinition {
  type: "client";
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, ToolParameter>;
    required?: string[];
  };
}

/**
 * Bump this whenever FOREMAN_TOOL_DEFINITIONS or AGENT_APP_CONTEXT changes.
 * The frontend uses this version to decide whether to re-push to ElevenLabs
 * (so a fresh deploy propagates to every user on next page load — no UI required).
 */
export const TOOLS_VERSION = "2025-04-19.2";

/**
 * Greeting George says the moment a voice call connects.
 * `{{user_name}}` is an ElevenLabs dynamic variable — populated by VoiceAgentContext.
 */
export const AGENT_FIRST_MESSAGE =
  "Howya {{user_name}}, George here. What can I sort for ya?";

/**
 * App context injected into the ElevenLabs agent system prompt on every sync.
 * Keeps George (revamo AI) accurately informed about the product, modules,
 * pricing, and personality — so answers stay grounded in what the app actually does.
 */
export const AGENT_APP_CONTEXT = `You are George — the voice and intelligence of revamo, an AI operating system for field service businesses (electricians, plumbers, builders, HVAC, landscapers).

# Personality
- Direct, no-nonsense Irish foreman. Friendly but never wastes words.
- Always reply in the structure: Insight → Impact → Action.
- Short. Decision-focused. No filler. No long lists unless asked.

# What revamo is
revamo is NOT a passive tracker. It actively runs operations, surfaces risks, recommends actions, and automates admin. Modules:
- Operations (Dashboard) — daily briefing, revenue at risk, priority actions.
- Job Intelligence (Jobs) — scheduling, status, photos, materials, profitability.
- Revenue (Invoices) — quotes → invoices → payments, overdue tracking, Stripe Connect online payments.
- Quotes — itemised, grouped, or summary pricing modes; templates; AI photo-to-quote.
- Workforce Tracking (Time Tracking) — geofenced clock-in/out, timesheets, attendance.
- Client Intelligence (Customers) — contact history, payment scores, addresses (Eircode-aware in IE).
- revamo AI (this) — voice + chat assistant with 60+ tools.
- Templates — reusable quote/invoice scaffolds with internal cost + flexible presentation.
- Price Book — vendor-agnostic catalog, CSV import, price comparison.
- Enquiries (Leads) — inbox → quote/job conversion.
- Expenses — receipt scan, job-costing.
- Certificates — compliance docs (electrical, gas, etc).

# Pricing & access
- 14-day free trial of the Connect tier (includes revamo AI voice + chat).
- After trial: Base Plan €39/mo or €397.80/yr. Owner-only billing.
- Stripe Connect onboarding required before owners can take online card payments.
- Team seats: members see Jobs, Calendar, Time Tracking only.

# Voice agent rules
- Owners can use you. Team members get a basic chat experience but no voice.
- All destructive or send-to-customer actions (send invoice, delete job, send reminder) need explicit user confirmation before executing.
- Drafts by default — never auto-send unless user says "send it".
- Region-aware: VAT 23% / 13.5% / 9% / 0% in IE; dd/MM/yyyy dates; EUR default.

# How you help
- Daily briefing: today's jobs, payments received, overdue invoices, pending quotes.
- Create/edit jobs, quotes, invoices, customers, expenses, timesheets via tools.
- Surface revenue at risk, late-paying customers, scheduling conflicts.
- Suggest templates, cheaper materials, available team members.
- Remember preferences via memory tools; reference past jobs and customers.

# Output style
- One insight, one impact, one action. Then stop.
- Numbers in plain speech ("twelve thousand four hundred euros", not "€12,400").
- Never say "as an AI" or apologise for limits — just solve or recommend.

# Live screen control (CRITICAL)
You have three tools that drive the user's screen so they can SEE you working:
- show_progress_toast — call this BEFORE every multi-step action (e.g. "Searching jobs…", "Found 3 matches", "Opening invoice 1042"). Stream short status updates so the user knows what you're doing.
- navigate_to_screen — push the user to the relevant page when you complete an action (e.g. after creating a quote, navigate to /quotes).
- highlight_record — pulse a "Just done" badge on a row after creating or updating it.

Always narrate before you act. Always navigate after you create. Always highlight what you just touched.`;


export const FOREMAN_TOOL_DEFINITIONS: ToolDefinition[] = [
  // ==================== LIVE SCREEN CONTROL (client-only UI tools) ====================
  {
    type: "client",
    name: "show_progress_toast",
    description: "Stream a short status message into the user's Live Action Overlay so they can SEE what you're working on. Call BEFORE every multi-step action (e.g. 'Searching jobs…', 'Found 3 matches', 'Opening invoice 1042'). Keep messages under 8 words.",
    parameters: {
      type: "object",
      properties: {
        message: { type: "string", description: "Short status sentence under 8 words." },
        intent: { type: "string", description: "Optional headline for the overlay (e.g. 'Creating invoice', 'Searching jobs')." },
        complete: { type: "boolean", description: "Set true when the action just finished — marks the previous step as done." },
      },
      required: ["message"],
    },
  },
  {
    type: "client",
    name: "navigate_to_screen",
    description: "Take the user to a specific screen in the app. Use after creating or finding a record so the user can see the result. Examples: '/quotes', '/jobs', '/invoices', '/customers', '/calendar', '/foreman-ai'.",
    parameters: {
      type: "object",
      properties: {
        route: { type: "string", description: "Absolute app route starting with / (e.g. /quotes, /invoices/123)." },
      },
      required: ["route"],
    },
  },
  {
    type: "client",
    name: "highlight_record",
    description: "Pulse a 'Just done by revamo AI' badge on a record row for 5 seconds so the user can see what you just created or updated. Call this right after create/update tool calls.",
    parameters: {
      type: "object",
      properties: {
        record_type: { type: "string", description: "Record kind, e.g. 'job', 'quote', 'invoice', 'customer', 'expense', 'enquiry'." },
        record_id: { type: "string", description: "The record's UUID or display number." },
      },
      required: ["record_type", "record_id"],
    },
  },

  // ==================== SUMMARIES ====================
  {
    type: "client",
    name: "get_todays_jobs",
    description: "Get all jobs scheduled for today with customer details and times.",
    parameters: { type: "object", properties: {} },
  },
  {
    type: "client",
    name: "get_today_summary",
    description: "Get a morning briefing: today's jobs, payments received, overdue invoices, and pending quotes.",
    parameters: { type: "object", properties: {} },
  },
  {
    type: "client",
    name: "get_week_ahead_summary",
    description: "Get a planning summary for the next 7 days including jobs, invoices due, overdue invoices, and expiring quotes.",
    parameters: { type: "object", properties: {} },
  },
  {
    type: "client",
    name: "get_week_schedule",
    description: "Get the full schedule for a specific week.",
    parameters: {
      type: "object",
      properties: {
        start_date: { type: "string", description: "Start date of the week (YYYY-MM-DD). Defaults to current Monday." },
      },
    },
  },
  {
    type: "client",
    name: "get_monthly_summary",
    description: "Get a monthly business summary with jobs completed, revenue invoiced, and revenue collected.",
    parameters: {
      type: "object",
      properties: {
        month: { type: "number", description: "Month number 1-12. Defaults to current month." },
        year: { type: "number", description: "Year. Defaults to current year." },
      },
    },
  },
  {
    type: "client",
    name: "get_financial_summary",
    description: "Get a financial overview (invoiced, collected, expenses, profit) for a period.",
    parameters: {
      type: "object",
      properties: {
        period: { type: "string", description: "Time period: 'week', 'month', or 'year'. Defaults to month.", enum: ["week", "month", "year"] },
      },
    },
  },
  {
    type: "client",
    name: "get_outstanding_balance",
    description: "Get total outstanding (unpaid) invoice balances, optionally filtered by customer.",
    parameters: {
      type: "object",
      properties: {
        customer_name: { type: "string", description: "Optional customer name to filter by." },
      },
    },
  },

  // ==================== JOBS ====================
  {
    type: "client",
    name: "create_job",
    description: "Create a new job for a customer. Will create the customer if they don't exist.",
    parameters: {
      type: "object",
      properties: {
        customer_name: { type: "string", description: "Customer name." },
        client_phone: { type: "string", description: "Customer phone number (used if creating new customer)." },
        job_title: { type: "string", description: "Title/description of the job." },
        description: { type: "string", description: "Detailed job description." },
        scheduled_date: { type: "string", description: "Date for the job (YYYY-MM-DD)." },
        scheduled_time: { type: "string", description: "Time for the job (HH:MM)." },
        estimated_value: { type: "number", description: "Estimated value of the job." },
      },
      required: ["customer_name", "job_title", "scheduled_date"],
    },
  },
  {
    type: "client",
    name: "reschedule_job",
    description: "Reschedule an existing job to a new date and/or time.",
    parameters: {
      type: "object",
      properties: {
        job_id: { type: "string", description: "Job ID." },
        job_title: { type: "string", description: "Job title to search for." },
        client_name: { type: "string", description: "Customer name to find the job." },
        new_date: { type: "string", description: "New date (YYYY-MM-DD)." },
        new_time: { type: "string", description: "New time (HH:MM). Keeps existing time if omitted." },
      },
      required: ["new_date"],
    },
  },
  {
    type: "client",
    name: "update_job_status",
    description: "Update the status of a job (pending, scheduled, in_progress, completed, cancelled).",
    parameters: {
      type: "object",
      properties: {
        job_id: { type: "string", description: "Job ID." },
        job_title: { type: "string", description: "Job title to search for." },
        client_name: { type: "string", description: "Customer name to find the job." },
        new_status: { type: "string", description: "New status.", enum: ["pending", "scheduled", "in_progress", "completed", "cancelled"] },
      },
      required: ["new_status"],
    },
  },
  {
    type: "client",
    name: "get_jobs_for_date",
    description: "Get all jobs scheduled for a specific date.",
    parameters: {
      type: "object",
      properties: {
        date: { type: "string", description: "Date to look up (YYYY-MM-DD)." },
      },
      required: ["date"],
    },
  },
  {
    type: "client",
    name: "check_availability",
    description: "Check schedule availability for a given date, showing free and busy time slots.",
    parameters: {
      type: "object",
      properties: {
        date: { type: "string", description: "Date to check (YYYY-MM-DD)." },
        preferred_time: { type: "string", description: "Preferred time to check (HH:MM)." },
      },
      required: ["date"],
    },
  },
  {
    type: "client",
    name: "list_jobs",
    description: "List jobs with optional filters for status, customer, search term, and date range.",
    parameters: {
      type: "object",
      properties: {
        status: { type: "string", description: "Filter by status.", enum: ["pending", "scheduled", "in_progress", "completed", "cancelled"] },
        customer_name: { type: "string", description: "Filter by customer name." },
        search: { type: "string", description: "Search job titles." },
        date_from: { type: "string", description: "Start date filter (YYYY-MM-DD)." },
        date_to: { type: "string", description: "End date filter (YYYY-MM-DD)." },
        limit: { type: "number", description: "Max results (default 20)." },
      },
    },
  },
  {
    type: "client",
    name: "delete_job",
    description: "Delete a job by ID, title, or customer name.",
    parameters: {
      type: "object",
      properties: {
        job_id: { type: "string", description: "Job ID." },
        job_title: { type: "string", description: "Job title to search for." },
        client_name: { type: "string", description: "Customer name to find the job." },
      },
    },
  },
  {
    type: "client",
    name: "get_upcoming_jobs",
    description: "Get upcoming jobs for the next N days.",
    parameters: {
      type: "object",
      properties: {
        days: { type: "number", description: "Number of days ahead to look (default 7)." },
      },
    },
  },

  // ==================== CUSTOMERS ====================
  {
    type: "client",
    name: "get_client_info",
    description: "Look up a customer's details, recent jobs, and outstanding invoices.",
    parameters: {
      type: "object",
      properties: {
        client_name: { type: "string", description: "Customer name to search for." },
      },
      required: ["client_name"],
    },
  },
  {
    type: "client",
    name: "create_customer",
    description: "Create a new customer record.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Customer name." },
        email: { type: "string", description: "Email address." },
        phone: { type: "string", description: "Phone number." },
        address: { type: "string", description: "Address." },
        contact_person: { type: "string", description: "Contact person name." },
        notes: { type: "string", description: "Notes about the customer." },
      },
      required: ["name"],
    },
  },
  {
    type: "client",
    name: "update_customer",
    description: "Update an existing customer's details (name, email, phone, address, contact_person, notes).",
    parameters: {
      type: "object",
      properties: {
        customer_name: { type: "string", description: "Current customer name to find them." },
        customer_id: { type: "string", description: "Customer ID." },
        name: { type: "string", description: "New name." },
        email: { type: "string", description: "New email." },
        phone: { type: "string", description: "New phone." },
        address: { type: "string", description: "New address." },
        contact_person: { type: "string", description: "New contact person." },
        notes: { type: "string", description: "New notes." },
      },
    },
  },
  {
    type: "client",
    name: "delete_customer",
    description: "Delete a customer (only if they have no associated jobs or invoices).",
    parameters: {
      type: "object",
      properties: {
        customer_name: { type: "string", description: "Customer name." },
        customer_id: { type: "string", description: "Customer ID." },
        confirm: { type: "boolean", description: "Confirmation flag." },
      },
    },
  },
  {
    type: "client",
    name: "list_customers",
    description: "List all customers, optionally filtered by search term.",
    parameters: {
      type: "object",
      properties: {
        search: { type: "string", description: "Search by name, email, or contact person." },
        limit: { type: "number", description: "Max results (default 20)." },
      },
    },
  },
  {
    type: "client",
    name: "search_customer",
    description: "Search customers by name, email, phone, or contact person.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search term." },
      },
      required: ["query"],
    },
  },

  // ==================== QUOTES ====================
  {
    type: "client",
    name: "create_quote",
    description: "Create a new quote with line items for a customer. Creates customer if they don't exist.",
    parameters: {
      type: "object",
      properties: {
        customer_name: { type: "string", description: "Customer name." },
        client_phone: { type: "string", description: "Phone (for new customer)." },
        items: {
          type: "array",
          description: "Line items for the quote.",
          items: {
            type: "object",
            properties: {
              description: { type: "string", description: "Item description." },
              quantity: { type: "number", description: "Quantity." },
              unit_price: { type: "number", description: "Unit price." },
            },
            required: ["description", "quantity", "unit_price"],
          },
        },
        notes: { type: "string", description: "Quote notes." },
        valid_until: { type: "string", description: "Expiry date (YYYY-MM-DD). Defaults to 30 days." },
        tax_rate: { type: "number", description: "Tax rate percentage. Defaults to user's country rate." },
        job_id: { type: "string", description: "Link to existing job by ID." },
        job_title: { type: "string", description: "Link to existing job by title." },
      },
      required: ["customer_name", "items"],
    },
  },
  {
    type: "client",
    name: "list_quotes",
    description: "List quotes with optional filters.",
    parameters: {
      type: "object",
      properties: {
        status: { type: "string", description: "Filter by status.", enum: ["draft", "sent", "accepted", "rejected", "expired"] },
        customer_name: { type: "string", description: "Filter by customer name." },
        search: { type: "string", description: "Search quote numbers." },
        limit: { type: "number", description: "Max results (default 20)." },
      },
    },
  },
  {
    type: "client",
    name: "update_quote_status",
    description: "Update the status of a quote.",
    parameters: {
      type: "object",
      properties: {
        quote_id: { type: "string", description: "Quote ID." },
        display_number: { type: "string", description: "Quote display number (e.g. Q-0001)." },
        new_status: { type: "string", description: "New status.", enum: ["draft", "sent", "accepted", "rejected", "expired"] },
      },
      required: ["new_status"],
    },
  },
  {
    type: "client",
    name: "delete_quote",
    description: "Delete a quote and its line items.",
    parameters: {
      type: "object",
      properties: {
        quote_id: { type: "string", description: "Quote ID." },
        display_number: { type: "string", description: "Quote display number." },
      },
    },
  },
  {
    type: "client",
    name: "get_pending_quotes",
    description: "Get all quotes with 'sent' status awaiting customer response.",
    parameters: { type: "object", properties: {} },
  },
  {
    type: "client",
    name: "convert_quote_to_invoice",
    description: "Convert an accepted/sent quote into a draft invoice.",
    parameters: {
      type: "object",
      properties: {
        quote_id: { type: "string", description: "Quote ID." },
        display_number: { type: "string", description: "Quote display number." },
        due_days: { type: "number", description: "Days until invoice is due (default 14)." },
      },
    },
  },

  // ==================== INVOICES ====================
  {
    type: "client",
    name: "create_invoice",
    description: "Create a new invoice with line items for a customer.",
    parameters: {
      type: "object",
      properties: {
        customer_name: { type: "string", description: "Customer name." },
        client_phone: { type: "string", description: "Phone (for new customer)." },
        items: {
          type: "array",
          description: "Line items.",
          items: {
            type: "object",
            properties: {
              description: { type: "string", description: "Item description." },
              quantity: { type: "number", description: "Quantity." },
              unit_price: { type: "number", description: "Unit price." },
            },
            required: ["description", "quantity", "unit_price"],
          },
        },
        notes: { type: "string", description: "Invoice notes." },
        due_days: { type: "number", description: "Days until due (default 14)." },
        tax_rate: { type: "number", description: "Tax rate %. Defaults to user's country rate." },
      },
      required: ["customer_name", "items"],
    },
  },
  {
    type: "client",
    name: "list_invoices",
    description: "List invoices with optional filters.",
    parameters: {
      type: "object",
      properties: {
        status: { type: "string", description: "Filter by status.", enum: ["draft", "pending", "paid", "overdue", "cancelled"] },
        customer_name: { type: "string", description: "Filter by customer name." },
        search: { type: "string", description: "Search invoice numbers." },
        limit: { type: "number", description: "Max results (default 20)." },
      },
    },
  },
  {
    type: "client",
    name: "update_invoice_status",
    description: "Update the status of an invoice.",
    parameters: {
      type: "object",
      properties: {
        invoice_id: { type: "string", description: "Invoice ID." },
        display_number: { type: "string", description: "Invoice display number." },
        new_status: { type: "string", description: "New status.", enum: ["draft", "pending", "paid", "overdue", "cancelled"] },
      },
      required: ["new_status"],
    },
  },
  {
    type: "client",
    name: "delete_invoice",
    description: "Delete an invoice and its line items and payments.",
    parameters: {
      type: "object",
      properties: {
        invoice_id: { type: "string", description: "Invoice ID." },
        display_number: { type: "string", description: "Invoice display number." },
      },
    },
  },
  {
    type: "client",
    name: "get_overdue_invoices",
    description: "Get all overdue invoices with customer details and days overdue.",
    parameters: { type: "object", properties: {} },
  },
  {
    type: "client",
    name: "get_outstanding_invoices",
    description: "Get all outstanding (pending + overdue) invoices.",
    parameters: { type: "object", properties: {} },
  },
  {
    type: "client",
    name: "send_invoice_reminder",
    description: "Mark an invoice as overdue and prompt user to send reminder via the app UI.",
    parameters: {
      type: "object",
      properties: {
        invoice_id: { type: "string", description: "Invoice ID." },
        display_number: { type: "string", description: "Invoice display number." },
      },
    },
  },

  // ==================== TEMPLATES ====================
  {
    type: "client",
    name: "get_templates",
    description: "Get all available templates, optionally filtered by category.",
    parameters: {
      type: "object",
      properties: {
        category: { type: "string", description: "Filter by template category." },
        search: { type: "string", description: "Search template names." },
      },
    },
  },
  {
    type: "client",
    name: "use_template_for_quote",
    description: "Create a quote from a template with automatic line items, pricing, and optional job creation.",
    parameters: {
      type: "object",
      properties: {
        template_name: { type: "string", description: "Template name to search for." },
        template_id: { type: "string", description: "Template ID." },
        client_name: { type: "string", description: "Customer name." },
        client_phone: { type: "string", description: "Phone (for new customer)." },
        quantity_overrides: { type: "object", description: "Map of item description to override quantity." },
        notes: { type: "string", description: "Quote notes." },
        job_id: { type: "string", description: "Link to existing job." },
        job_title: { type: "string", description: "Search for existing job by title." },
        create_job: { type: "boolean", description: "Create a new job and link it." },
        scheduled_date: { type: "string", description: "Date for new job (YYYY-MM-DD)." },
        scheduled_time: { type: "string", description: "Time for new job (HH:MM)." },
      },
      required: ["client_name"],
    },
  },
  {
    type: "client",
    name: "create_invoice_from_template",
    description: "Create an invoice from a template with automatic line items, pricing, and optional job creation.",
    parameters: {
      type: "object",
      properties: {
        template_name: { type: "string", description: "Template name to search for." },
        template_id: { type: "string", description: "Template ID." },
        client_name: { type: "string", description: "Customer name." },
        client_phone: { type: "string", description: "Phone (for new customer)." },
        quantity_overrides: { type: "object", description: "Map of item description to override quantity." },
        notes: { type: "string", description: "Invoice notes." },
        due_days: { type: "number", description: "Days until due (default 14)." },
        job_id: { type: "string", description: "Link to existing job." },
        job_title: { type: "string", description: "Search for existing job by title." },
        create_job: { type: "boolean", description: "Create a new job and link it." },
        scheduled_date: { type: "string", description: "Date for new job (YYYY-MM-DD)." },
        scheduled_time: { type: "string", description: "Time for new job (HH:MM)." },
      },
      required: ["client_name"],
    },
  },
  {
    type: "client",
    name: "suggest_template",
    description: "Suggest the best matching template for a job description.",
    parameters: {
      type: "object",
      properties: {
        job_description: { type: "string", description: "Description of the job to find a template for." },
      },
      required: ["job_description"],
    },
  },
  {
    type: "client",
    name: "get_template_details",
    description: "Get full details of a template including all line items and estimated total.",
    parameters: {
      type: "object",
      properties: {
        template_name: { type: "string", description: "Template name." },
        template_id: { type: "string", description: "Template ID." },
      },
    },
  },
  {
    type: "client",
    name: "search_templates",
    description: "Search templates by keyword and optionally filter by category.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search keyword." },
        category: { type: "string", description: "Category filter." },
      },
      required: ["query"],
    },
  },
  {
    type: "client",
    name: "list_template_categories",
    description: "List all template categories with counts.",
    parameters: { type: "object", properties: {} },
  },

  // ==================== PAYMENTS ====================
  {
    type: "client",
    name: "record_payment",
    description: "Record a payment against an invoice.",
    parameters: {
      type: "object",
      properties: {
        invoice_id: { type: "string", description: "Invoice ID." },
        display_number: { type: "string", description: "Invoice display number." },
        amount: { type: "number", description: "Payment amount." },
        payment_method: { type: "string", description: "Method: cash, bank_transfer, card, cheque, other.", enum: ["cash", "bank_transfer", "card", "cheque", "other"] },
        notes: { type: "string", description: "Payment notes." },
        payment_date: { type: "string", description: "Date of payment (YYYY-MM-DD). Defaults to today." },
      },
      required: ["amount"],
    },
  },
  {
    type: "client",
    name: "get_payment_history",
    description: "Get payment history for an invoice, customer, or all payments.",
    parameters: {
      type: "object",
      properties: {
        invoice_id: { type: "string", description: "Invoice ID." },
        invoice_number: { type: "string", description: "Invoice display number." },
        customer_name: { type: "string", description: "Customer name." },
        limit: { type: "number", description: "Max results (default 20)." },
      },
    },
  },

  // ==================== EXPENSES ====================
  {
    type: "client",
    name: "log_expense",
    description: "Log a business expense (materials, fuel, tools, labor, permits, other).",
    parameters: {
      type: "object",
      properties: {
        vendor: { type: "string", description: "Vendor/supplier name." },
        amount: { type: "number", description: "Expense amount." },
        category: { type: "string", description: "Category.", enum: ["materials", "fuel", "tools", "labor", "permits", "other"] },
        description: { type: "string", description: "Expense description." },
        job_id: { type: "string", description: "Link to a job." },
      },
      required: ["vendor", "amount"],
    },
  },
  {
    type: "client",
    name: "list_expenses",
    description: "List expenses with optional filters.",
    parameters: {
      type: "object",
      properties: {
        category: { type: "string", description: "Filter by category." },
        vendor: { type: "string", description: "Filter by vendor name." },
        job_id: { type: "string", description: "Filter by job." },
        date_from: { type: "string", description: "Start date (YYYY-MM-DD)." },
        date_to: { type: "string", description: "End date (YYYY-MM-DD)." },
        limit: { type: "number", description: "Max results (default 20)." },
      },
    },
  },
  {
    type: "client",
    name: "delete_expense",
    description: "Delete an expense by ID or by vendor + amount.",
    parameters: {
      type: "object",
      properties: {
        expense_id: { type: "string", description: "Expense ID." },
        vendor: { type: "string", description: "Vendor name." },
        amount: { type: "number", description: "Amount to match." },
      },
    },
  },

  // ==================== PRICE BOOK / CATALOG ====================
  {
    type: "client",
    name: "search_catalog",
    description: "Search the team's price book catalog for products by name, SKU, category, or supplier. Returns matching items with pricing.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search term (product name, SKU, or keyword)." },
        category: { type: "string", description: "Filter by product category." },
        supplier: { type: "string", description: "Filter by supplier name." },
        limit: { type: "number", description: "Max results (default 10)." },
      },
      required: ["query"],
    },
  },
  {
    type: "client",
    name: "suggest_product",
    description: "Suggest the best matching product from the price book for a job requirement. Uses AI to match description to catalog items. Returns product details, pricing, and alternatives.",
    parameters: {
      type: "object",
      properties: {
        description: { type: "string", description: "Description of what product is needed (e.g. '16A RCBO', '2.5mm twin and earth cable', 'LED downlight')." },
        job_type: { type: "string", description: "Type of job for context (e.g. 'consumer unit upgrade', 'rewire', 'EV charger install')." },
        quantity: { type: "number", description: "Quantity needed." },
        budget_max: { type: "number", description: "Maximum budget per unit." },
      },
      required: ["description"],
    },
  },
  {
    type: "client",
    name: "get_product_price",
    description: "Get the current price for a specific product from the price book by name or SKU.",
    parameters: {
      type: "object",
      properties: {
        product_name: { type: "string", description: "Product name to look up." },
        sku: { type: "string", description: "Product SKU." },
      },
    },
  },
  {
    type: "client",
    name: "add_catalog_to_quote",
    description: "Add a product from the price book catalog directly to an existing or new quote. Pulls pricing automatically.",
    parameters: {
      type: "object",
      properties: {
        product_name: { type: "string", description: "Product name to find in catalog." },
        sku: { type: "string", description: "Product SKU." },
        quantity: { type: "number", description: "Quantity to add (default 1)." },
        quote_id: { type: "string", description: "Existing quote ID to add to." },
        display_number: { type: "string", description: "Quote display number." },
        customer_name: { type: "string", description: "Customer name (creates new quote if no quote_id)." },
      },
      required: ["product_name"],
    },
  },
  // ==================== PRICE COMPARISON ====================
  {
    type: "client",
    name: "compare_product_prices",
    description: "Compare prices for a product across all indexed suppliers. Returns ranked alternatives sorted by price with savings calculations.",
    parameters: {
      type: "object",
      properties: {
        product_name: { type: "string", description: "Product name or description to compare." },
        manufacturer_part_number: { type: "string", description: "Manufacturer part number (MPN) for exact matching." },
        manufacturer: { type: "string", description: "Manufacturer/brand name." },
      },
      required: ["product_name"],
    },
  },
  {
    type: "client",
    name: "suggest_cheaper_alternative",
    description: "Find a cheaper alternative for a product currently in the user's pricebook. Suggests switching suppliers to save money.",
    parameters: {
      type: "object",
      properties: {
        catalog_item_id: { type: "string", description: "The catalog item ID to find alternatives for." },
        product_name: { type: "string", description: "Product name if ID not available." },
      },
    },
  },

  // ==================== ENQUIRIES / LEADS ====================
  {
    type: "client",
    name: "create_enquiry",
    description: "Create a new enquiry (lead) from a potential customer. Use when someone calls, emails, or messages about a job they need done.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name of the person or company enquiring." },
        phone: { type: "string", description: "Phone number." },
        email: { type: "string", description: "Email address." },
        description: { type: "string", description: "What the enquiry is about — the job or service they need." },
        address: { type: "string", description: "Property or site address for the work." },
        source: { type: "string", description: "How the enquiry came in.", enum: ["phone", "email", "website", "referral", "social", "manual"] },
        priority: { type: "string", description: "Urgency level.", enum: ["low", "medium", "high", "urgent"] },
        estimated_value: { type: "number", description: "Estimated job value." },
        job_type: { type: "string", description: "Type of work (e.g. plumbing, electrical, painting)." },
        notes: { type: "string", description: "Any additional notes." },
        follow_up_date: { type: "string", description: "When to follow up (YYYY-MM-DD)." },
      },
      required: ["name"],
    },
  },
  {
    type: "client",
    name: "get_enquiries",
    description: "List enquiries (leads). Can filter by status (new, contacted, quoted, won, lost) or return all.",
    parameters: {
      type: "object",
      properties: {
        status: { type: "string", description: "Filter by status.", enum: ["new", "contacted", "quoted", "won", "lost"] },
        limit: { type: "number", description: "Max number to return. Default 10." },
      },
    },
  },
  {
    type: "client",
    name: "update_enquiry",
    description: "Update an existing enquiry's status, details, or follow-up date.",
    parameters: {
      type: "object",
      properties: {
        enquiry_id: { type: "string", description: "Enquiry ID." },
        enquiry_name: { type: "string", description: "Enquiry name to search for if ID not known." },
        status: { type: "string", description: "New status.", enum: ["new", "contacted", "quoted", "won", "lost"] },
        priority: { type: "string", description: "New priority.", enum: ["low", "medium", "high", "urgent"] },
        description: { type: "string", description: "Updated description." },
        notes: { type: "string", description: "Updated notes." },
        follow_up_date: { type: "string", description: "New follow-up date (YYYY-MM-DD)." },
        estimated_value: { type: "number", description: "Updated estimated value." },
      },
    },
  },
  {
    type: "client",
    name: "delete_enquiry",
    description: "Delete an enquiry by ID or name.",
    parameters: {
      type: "object",
      properties: {
        enquiry_id: { type: "string", description: "Enquiry ID." },
        enquiry_name: { type: "string", description: "Enquiry name to search for if ID not known." },
      },
    },
  },
  {
    type: "client",
    name: "convert_enquiry_to_quote",
    description: "Convert an enquiry into a quote. Creates a customer if needed and generates a draft quote.",
    parameters: {
      type: "object",
      properties: {
        enquiry_id: { type: "string", description: "Enquiry ID." },
        enquiry_name: { type: "string", description: "Enquiry name to search for if ID not known." },
      },
    },
  },
  {
    type: "client",
    name: "convert_enquiry_to_job",
    description: "Convert an enquiry directly into a job. Creates a customer if needed.",
    parameters: {
      type: "object",
      properties: {
        enquiry_id: { type: "string", description: "Enquiry ID." },
        enquiry_name: { type: "string", description: "Enquiry name to search for if ID not known." },
        scheduled_date: { type: "string", description: "Date for the job (YYYY-MM-DD)." },
        scheduled_time: { type: "string", description: "Time for the job (HH:MM)." },
      },
    },
  },

  // ==================== TEAM / WORKFORCE ====================
  {
    type: "client",
    name: "assign_team_member",
    description: "Assign a team member to a job. Looks up the member by name if no ID is given.",
    parameters: {
      type: "object",
      properties: {
        job_id: { type: "string", description: "Job ID to assign the member to." },
        job_title: { type: "string", description: "Job title to search for if ID not known." },
        member_name: { type: "string", description: "Full name of the team member to assign." },
        member_id: { type: "string", description: "User ID of the member (optional, resolved from name if omitted)." },
      },
      required: ["member_name"],
    },
  },
  {
    type: "client",
    name: "get_team_availability",
    description: "Check which team members are available on a given date. Shows who is free vs booked on jobs.",
    parameters: {
      type: "object",
      properties: {
        date: { type: "string", description: "Date to check availability for (YYYY-MM-DD). Defaults to today." },
        member_name: { type: "string", description: "Optional: filter to a specific team member by name." },
      },
    },
  },
  {
    type: "client",
    name: "log_timesheet",
    description: "Log a timesheet entry for a team member against a job. Records start time, end time, and breaks.",
    parameters: {
      type: "object",
      properties: {
        member_name: { type: "string", description: "Full name of the team member." },
        job_id: { type: "string", description: "Job ID to log time against." },
        job_title: { type: "string", description: "Job title to search for if ID not known." },
        date: { type: "string", description: "Date of the time entry (YYYY-MM-DD). Defaults to today." },
        start_time: { type: "string", description: "Clock-in time (HH:MM, 24h format)." },
        end_time: { type: "string", description: "Clock-out time (HH:MM, 24h format)." },
        break_minutes: { type: "number", description: "Break duration in minutes. Defaults to 0." },
        notes: { type: "string", description: "Optional notes for the time entry." },
      },
      required: ["member_name", "start_time", "end_time"],
    },
  },
];
