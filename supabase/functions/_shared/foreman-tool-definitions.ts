/**
 * Foreman AI — Single source of truth for all ElevenLabs client tool definitions.
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

export const FOREMAN_TOOL_DEFINITIONS: ToolDefinition[] = [
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
];
