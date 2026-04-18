// AUTO-GENERATED mirror of supabase/functions/_shared/foreman-tool-definitions.ts (names + descriptions only).
// When you add a new tool there, regenerate this file. The Capabilities page reads this list.

export interface ToolListEntry { name: string; description: string; }

export const FOREMAN_TOOL_LIST: ToolListEntry[] = [
  {
    "name": "get_todays_jobs",
    "description": "Get all jobs scheduled for today with customer details and times."
  },
  {
    "name": "get_today_summary",
    "description": "Get a morning briefing: today's jobs, payments received, overdue invoices, and pending quotes."
  },
  {
    "name": "get_week_ahead_summary",
    "description": "Get a planning summary for the next 7 days including jobs, invoices due, overdue invoices, and expiring quotes."
  },
  {
    "name": "get_week_schedule",
    "description": "Get the full schedule for a specific week."
  },
  {
    "name": "get_monthly_summary",
    "description": "Get a monthly business summary with jobs completed, revenue invoiced, and revenue collected."
  },
  {
    "name": "get_financial_summary",
    "description": "Get a financial overview (invoiced, collected, expenses, profit) for a period."
  },
  {
    "name": "get_outstanding_balance",
    "description": "Get total outstanding (unpaid) invoice balances, optionally filtered by customer."
  },
  {
    "name": "create_job",
    "description": "Create a new job for a customer. Will create the customer if they don't exist."
  },
  {
    "name": "reschedule_job",
    "description": "Reschedule an existing job to a new date and/or time."
  },
  {
    "name": "update_job_status",
    "description": "Update the status of a job (pending, scheduled, in_progress, completed, cancelled)."
  },
  {
    "name": "get_jobs_for_date",
    "description": "Get all jobs scheduled for a specific date."
  },
  {
    "name": "check_availability",
    "description": "Check schedule availability for a given date, showing free and busy time slots."
  },
  {
    "name": "list_jobs",
    "description": "List jobs with optional filters for status, customer, search term, and date range."
  },
  {
    "name": "delete_job",
    "description": "Delete a job by ID, title, or customer name."
  },
  {
    "name": "get_upcoming_jobs",
    "description": "Get upcoming jobs for the next N days."
  },
  {
    "name": "get_client_info",
    "description": "Look up a customer's details, recent jobs, and outstanding invoices."
  },
  {
    "name": "create_customer",
    "description": "Create a new customer record."
  },
  {
    "name": "update_customer",
    "description": "Update an existing customer's details (name, email, phone, address, contact_person, notes)."
  },
  {
    "name": "delete_customer",
    "description": "Delete a customer (only if they have no associated jobs or invoices)."
  },
  {
    "name": "list_customers",
    "description": "List all customers, optionally filtered by search term."
  },
  {
    "name": "search_customer",
    "description": "Search customers by name, email, phone, or contact person."
  },
  {
    "name": "create_quote",
    "description": "Create a new quote with line items for a customer. Creates customer if they don't exist."
  },
  {
    "name": "list_quotes",
    "description": "List quotes with optional filters."
  },
  {
    "name": "update_quote_status",
    "description": "Update the status of a quote."
  },
  {
    "name": "delete_quote",
    "description": "Delete a quote and its line items."
  },
  {
    "name": "get_pending_quotes",
    "description": "Get all quotes with 'sent' status awaiting customer response."
  },
  {
    "name": "convert_quote_to_invoice",
    "description": "Convert an accepted/sent quote into a draft invoice."
  },
  {
    "name": "create_invoice",
    "description": "Create a new invoice with line items for a customer."
  },
  {
    "name": "list_invoices",
    "description": "List invoices with optional filters."
  },
  {
    "name": "update_invoice_status",
    "description": "Update the status of an invoice."
  },
  {
    "name": "delete_invoice",
    "description": "Delete an invoice and its line items and payments."
  },
  {
    "name": "get_overdue_invoices",
    "description": "Get all overdue invoices with customer details and days overdue."
  },
  {
    "name": "get_outstanding_invoices",
    "description": "Get all outstanding (pending + overdue) invoices."
  },
  {
    "name": "send_invoice_reminder",
    "description": "Mark an invoice as overdue and prompt user to send reminder via the app UI."
  },
  {
    "name": "get_templates",
    "description": "Get all available templates, optionally filtered by category."
  },
  {
    "name": "use_template_for_quote",
    "description": "Create a quote from a template with automatic line items, pricing, and optional job creation."
  },
  {
    "name": "create_invoice_from_template",
    "description": "Create an invoice from a template with automatic line items, pricing, and optional job creation."
  },
  {
    "name": "suggest_template",
    "description": "Suggest the best matching template for a job description."
  },
  {
    "name": "get_template_details",
    "description": "Get full details of a template including all line items and estimated total."
  },
  {
    "name": "search_templates",
    "description": "Search templates by keyword and optionally filter by category."
  },
  {
    "name": "list_template_categories",
    "description": "List all template categories with counts."
  },
  {
    "name": "record_payment",
    "description": "Record a payment against an invoice."
  },
  {
    "name": "get_payment_history",
    "description": "Get payment history for an invoice, customer, or all payments."
  },
  {
    "name": "log_expense",
    "description": "Log a business expense (materials, fuel, tools, labor, permits, other)."
  },
  {
    "name": "list_expenses",
    "description": "List expenses with optional filters."
  },
  {
    "name": "delete_expense",
    "description": "Delete an expense by ID or by vendor + amount."
  },
  {
    "name": "search_catalog",
    "description": "Search the team's price book catalog for products by name, SKU, category, or supplier. Returns matching items with pricing."
  },
  {
    "name": "suggest_product",
    "description": "Suggest the best matching product from the price book for a job requirement. Uses AI to match description to catalog items. Returns product details, pricing, and alternatives."
  },
  {
    "name": "get_product_price",
    "description": "Get the current price for a specific product from the price book by name or SKU."
  },
  {
    "name": "add_catalog_to_quote",
    "description": "Add a product from the price book catalog directly to an existing or new quote. Pulls pricing automatically."
  },
  {
    "name": "compare_product_prices",
    "description": "Compare prices for a product across all indexed suppliers. Returns ranked alternatives sorted by price with savings calculations."
  },
  {
    "name": "suggest_cheaper_alternative",
    "description": "Find a cheaper alternative for a product currently in the user's pricebook. Suggests switching suppliers to save money."
  },
  {
    "name": "create_enquiry",
    "description": "Create a new enquiry (lead) from a potential customer. Use when someone calls, emails, or messages about a job they need done."
  },
  {
    "name": "get_enquiries",
    "description": "List enquiries (leads). Can filter by status (new, contacted, quoted, won, lost) or return all."
  },
  {
    "name": "update_enquiry",
    "description": "Update an existing enquiry's status, details, or follow-up date."
  },
  {
    "name": "delete_enquiry",
    "description": "Delete an enquiry by ID or name."
  },
  {
    "name": "convert_enquiry_to_quote",
    "description": "Convert an enquiry into a quote. Creates a customer if needed and generates a draft quote."
  },
  {
    "name": "convert_enquiry_to_job",
    "description": "Convert an enquiry directly into a job. Creates a customer if needed."
  },
  {
    "name": "assign_team_member",
    "description": "Assign a team member to a job. Looks up the member by name if no ID is given."
  },
  {
    "name": "get_team_availability",
    "description": "Check which team members are available on a given date. Shows who is free vs booked on jobs."
  },
  {
    "name": "log_timesheet",
    "description": "Log a timesheet entry for a team member against a job. Records start time, end time, and breaks."
  }
];
