

# Generate Complete ElevenLabs Client Tool JSON

## The Situation

Yes — every client tool registered in the frontend (`useElevenLabsAgent.ts`) must have a matching JSON definition in the ElevenLabs dashboard. If a tool exists in the code but not in the dashboard, the agent will never call it. There are **52 client tools** registered.

## What I'll Do

Generate a downloadable JSON file containing all 52 tool definitions with correct names, descriptions, and parameter schemas — ready to paste into the ElevenLabs dashboard.

The tools break down into these categories:

| Category | Tools | Count |
|----------|-------|-------|
| Summaries | get_today_summary, get_week_ahead_summary, get_todays_jobs, get_monthly_summary, get_financial_summary, get_week_schedule | 6 |
| Jobs | create_job, list_jobs, get_jobs_for_date, get_upcoming_jobs, reschedule_job, update_job_status, delete_job, check_availability | 8 |
| Customers | create_customer, update_customer, delete_customer, list_customers, search_customer, get_client_info | 6 |
| Quotes | create_quote, list_quotes, get_pending_quotes, update_quote_status, delete_quote, merge_quotes | 6 |
| Invoices | create_invoice, list_invoices, get_outstanding_invoices, get_overdue_invoices, update_invoice_status, delete_invoice, create_invoice_from_quote, send_invoice_reminder | 8 |
| Templates | get_templates, get_template_details, search_templates, list_template_categories, suggest_template, use_template_for_quote, create_invoice_from_template, add_template_to_quote, add_template_to_invoice | 9 |
| Payments | record_payment, get_payment_history, get_outstanding_balance | 3 |
| Expenses | log_expense, list_expenses, delete_expense | 3 |
| Enquiries | create_enquiry, list_enquiries, update_enquiry, update_enquiry_status, convert_enquiry_to_customer, convert_enquiry_to_quote | 6 |
| Advisory | get_business_insights, draft_customer_message, estimate_job_cost, ask_foreman | 4 |

## Output

A single JSON file at `/mnt/documents/elevenlabs-client-tools.json` containing every tool definition with:
- `name` matching the exact function name in the webhook
- `description` explaining what the tool does (helps the agent decide when to use it)
- `parameters` as a JSON Schema object matching the TypeScript types in `useElevenLabsAgent.ts`
- All tools set to `type: "client"` (executed by the frontend, not server-side)

## How to Use It

1. Open ElevenLabs dashboard → your agent → Tools
2. For each tool, add a new "Client" tool
3. Paste the name, description, and parameters schema from the JSON file
4. Save

This is a one-time setup. After this, any new skills added to `george-webhook` + `useElevenLabsAgent.ts` just need a matching entry added in the dashboard.

