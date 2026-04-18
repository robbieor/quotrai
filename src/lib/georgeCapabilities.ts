import {
  Sparkles,
  Briefcase,
  Users,
  FileText,
  Receipt,
  FolderOpen,
  CreditCard,
  Wallet,
  Package,
  TrendingDown,
  UserPlus,
  Clock,
  type LucideIcon,
} from "lucide-react";

export interface CapabilityCategory {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
  /** Tool name prefixes that belong in this category */
  match: (toolName: string) => boolean;
}

export interface Capability {
  name: string;
  friendlyName: string;
  description: string;
  example: string;
  category: string;
}

export const CAPABILITY_CATEGORIES: CapabilityCategory[] = [
  {
    id: "summaries",
    label: "Briefings & Insights",
    icon: Sparkles,
    description: "Daily and weekly summaries of what needs attention.",
    match: (n) =>
      n.startsWith("get_today") ||
      n.startsWith("get_week") ||
      n.startsWith("get_monthly") ||
      n.startsWith("get_financial") ||
      n.startsWith("get_outstanding_balance") ||
      n === "get_todays_jobs",
  },
  {
    id: "jobs",
    label: "Jobs",
    icon: Briefcase,
    description: "Schedule, update, and track every job.",
    match: (n) =>
      n.includes("job") &&
      !n.includes("invoice") &&
      !n.includes("template") &&
      !n.includes("timesheet"),
  },
  {
    id: "customers",
    label: "Clients",
    icon: Users,
    description: "Customer records, history, and contact info.",
    match: (n) => n.includes("customer") || n === "get_client_info" || n === "search_customer",
  },
  {
    id: "quotes",
    label: "Quotes",
    icon: FileText,
    description: "Build, send, and track quotes through to acceptance.",
    match: (n) => n.includes("quote") && !n.includes("template"),
  },
  {
    id: "invoices",
    label: "Revenue",
    icon: Receipt,
    description: "Invoices, payment status, and overdue chasing.",
    match: (n) =>
      (n.includes("invoice") && !n.includes("template")) ||
      n === "get_overdue_invoices" ||
      n === "get_outstanding_invoices",
  },
  {
    id: "templates",
    label: "Templates",
    icon: FolderOpen,
    description: "Reusable scaffolds for quotes and invoices.",
    match: (n) => n.includes("template"),
  },
  {
    id: "payments",
    label: "Payments",
    icon: CreditCard,
    description: "Record payments and review history.",
    match: (n) => n.includes("payment"),
  },
  {
    id: "expenses",
    label: "Expenses",
    icon: Wallet,
    description: "Log and categorise costs against jobs.",
    match: (n) => n.includes("expense"),
  },
  {
    id: "pricebook",
    label: "Price Book",
    icon: Package,
    description: "Catalog lookup and product pricing.",
    match: (n) =>
      n.includes("catalog") ||
      n === "suggest_product" ||
      n === "get_product_price" ||
      n === "add_catalog_to_quote",
  },
  {
    id: "comparison",
    label: "Price Comparison",
    icon: TrendingDown,
    description: "Find cheaper alternatives across vendors.",
    match: (n) => n.includes("compare_product_prices") || n === "suggest_cheaper_alternative",
  },
  {
    id: "enquiries",
    label: "Enquiries",
    icon: UserPlus,
    description: "Convert leads into quotes and jobs.",
    match: (n) => n.includes("enquir"),
  },
  {
    id: "workforce",
    label: "Workforce",
    icon: Clock,
    description: "Team availability, assignments, and timesheets.",
    match: (n) =>
      n.includes("team_member") ||
      n.includes("team_availability") ||
      n.includes("timesheet") ||
      n === "assign_team_member",
  },
];

/**
 * Friendly metadata for each tool — descriptions and example phrases.
 * Anything not listed falls back to the raw description from the tool registry.
 */
export const CAPABILITY_META: Record<string, { friendly: string; example: string }> = {
  // Summaries
  get_todays_jobs: { friendly: "Today's job list", example: "What jobs do I have on today?" },
  get_today_summary: { friendly: "Morning briefing", example: "Give me my morning briefing" },
  get_week_ahead_summary: { friendly: "Week ahead", example: "What's coming up this week?" },
  get_week_schedule: { friendly: "Week schedule", example: "Show me next week's schedule" },
  get_monthly_summary: { friendly: "Monthly summary", example: "How did this month go?" },
  get_financial_summary: { friendly: "Financial summary", example: "How's the cashflow looking?" },
  get_outstanding_balance: { friendly: "Money owed", example: "How much is owed to us right now?" },

  // Jobs
  create_job: { friendly: "Create a job", example: "Book a boiler service for John Murphy on Friday" },
  reschedule_job: { friendly: "Reschedule a job", example: "Move the Murphy job to next Tuesday" },
  update_job_status: { friendly: "Update job status", example: "Mark the Murphy job as complete" },
  get_jobs_for_date: { friendly: "Jobs on a date", example: "What's on for Thursday?" },
  check_availability: { friendly: "Check availability", example: "Am I free on Wednesday afternoon?" },
  list_jobs: { friendly: "List jobs", example: "Show me all jobs in progress" },
  delete_job: { friendly: "Delete a job", example: "Cancel the Murphy job" },
  get_upcoming_jobs: { friendly: "Upcoming jobs", example: "What's coming up?" },

  // Customers
  get_client_info: { friendly: "Look up a client", example: "Tell me about John Murphy" },
  create_customer: { friendly: "Add a client", example: "Add Sarah Walsh as a new client" },
  update_customer: { friendly: "Update a client", example: "Change John's phone number" },
  delete_customer: { friendly: "Remove a client", example: "Delete the test customer" },
  list_customers: { friendly: "List clients", example: "Show me all my clients" },
  search_customer: { friendly: "Search clients", example: "Find clients in Dublin 4" },

  // Quotes
  create_quote: { friendly: "Build a quote", example: "Quote John €450 for a boiler service" },
  list_quotes: { friendly: "List quotes", example: "Show me all open quotes" },
  update_quote_status: { friendly: "Update quote status", example: "Mark John's quote as accepted" },
  delete_quote: { friendly: "Delete a quote", example: "Delete quote 1024" },
  get_pending_quotes: { friendly: "Pending quotes", example: "What quotes are still waiting?" },
  convert_quote_to_invoice: { friendly: "Quote to invoice", example: "Turn quote 1024 into an invoice" },

  // Invoices
  create_invoice: { friendly: "Raise an invoice", example: "Invoice Sarah €1,200 for the rewire" },
  list_invoices: { friendly: "List invoices", example: "Show all unpaid invoices" },
  update_invoice_status: { friendly: "Update invoice status", example: "Mark invoice 1043 as paid" },
  delete_invoice: { friendly: "Delete an invoice", example: "Delete invoice 1043" },
  get_overdue_invoices: { friendly: "Overdue invoices", example: "Who's overdue?" },
  get_outstanding_invoices: { friendly: "Outstanding invoices", example: "What's outstanding?" },
  send_invoice_reminder: { friendly: "Send reminder", example: "Chase Sarah on invoice 1043" },

  // Templates
  get_templates: { friendly: "Browse templates", example: "Show me my quote templates" },
  use_template_for_quote: { friendly: "Quote from template", example: "Quote John using the boiler template" },
  create_invoice_from_template: { friendly: "Invoice from template", example: "Invoice Sarah using the rewire template" },
  suggest_template: { friendly: "Suggest a template", example: "Which template fits a kitchen rewire?" },
  get_template_details: { friendly: "Template details", example: "What's in the boiler template?" },
  search_templates: { friendly: "Search templates", example: "Find templates for plumbing" },
  list_template_categories: { friendly: "Template categories", example: "What template categories do I have?" },

  // Payments
  record_payment: { friendly: "Record a payment", example: "Sarah paid €600 cash today" },
  get_payment_history: { friendly: "Payment history", example: "Show me payments this month" },

  // Expenses
  log_expense: { friendly: "Log an expense", example: "Add €85 fuel from Topaz today" },
  list_expenses: { friendly: "List expenses", example: "Show expenses this month" },
  delete_expense: { friendly: "Delete an expense", example: "Delete the duplicate fuel expense" },

  // Price book
  search_catalog: { friendly: "Search price book", example: "Find 2.5mm twin and earth" },
  suggest_product: { friendly: "Suggest a product", example: "What should I use for a sink trap?" },
  get_product_price: { friendly: "Get product price", example: "What's my price for a Vaillant boiler?" },
  add_catalog_to_quote: { friendly: "Add to quote", example: "Add 50m of 2.5mm cable to John's quote" },

  // Comparison
  compare_product_prices: { friendly: "Compare prices", example: "Compare boiler prices across suppliers" },
  suggest_cheaper_alternative: { friendly: "Cheaper alternative", example: "Is there a cheaper version of this?" },

  // Enquiries
  create_enquiry: { friendly: "Log an enquiry", example: "New enquiry: Mary called about a leak in D6" },
  get_enquiries: { friendly: "List enquiries", example: "Show me all open enquiries" },
  update_enquiry: { friendly: "Update an enquiry", example: "Mark Mary's enquiry as won" },
  delete_enquiry: { friendly: "Delete an enquiry", example: "Delete the spam enquiry" },
  convert_enquiry_to_quote: { friendly: "Enquiry to quote", example: "Quote Mary for the leak repair" },
  convert_enquiry_to_job: { friendly: "Enquiry to job", example: "Book Mary's leak in for tomorrow" },

  // Workforce
  assign_team_member: { friendly: "Assign team member", example: "Put Tom on the Murphy job" },
  get_team_availability: { friendly: "Team availability", example: "Who's free on Friday?" },
  log_timesheet: { friendly: "Log timesheet", example: "Log Tom 8 to 4 on the Murphy job" },
};

export function categoriseTool(toolName: string): string {
  for (const cat of CAPABILITY_CATEGORIES) {
    if (cat.match(toolName)) return cat.id;
  }
  return "summaries";
}

export function buildCapability(
  toolName: string,
  rawDescription: string,
): Capability {
  const meta = CAPABILITY_META[toolName];
  return {
    name: toolName,
    friendlyName: meta?.friendly ?? toolName.replace(/_/g, " "),
    description: rawDescription,
    example: meta?.example ?? "",
    category: categoriseTool(toolName),
  };
}
