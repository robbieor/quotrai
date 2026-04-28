// Single source of truth for every place Foreman AI is allowed to navigate,
// open, scroll to, or highlight. The voice agent only ever sees these keys —
// never raw paths or CSS selectors.

// ROUTES — every page the agent can navigate to.
export const AGENT_ROUTES = {
  dashboard: { path: "/dashboard", label: "Dashboard" },
  jobs: { path: "/jobs", label: "Jobs" },
  invoices: { path: "/invoices", label: "Invoices" },
  customers: { path: "/customers", label: "Customers" },
  quotes: { path: "/quotes", label: "Quotes" },
  workforce: { path: "/time-tracking", label: "Workforce Tracking" },
  reports: { path: "/reports", label: "Reports" },
  settings: { path: "/settings", label: "Settings" },
} as const;
export type AgentRoute = keyof typeof AGENT_ROUTES;

// RECORDS — every record type the agent can open by id. The app currently
// uses detail sheets driven by `?open=<id>` on the list pages, so the URL
// includes that query param. List pages can read it to auto-open the sheet.
export const AGENT_RECORDS = {
  invoice: (id: string) => `/invoices?open=${encodeURIComponent(id)}`,
  job: (id: string) => `/jobs?open=${encodeURIComponent(id)}`,
  customer: (id: string) => `/customers?open=${encodeURIComponent(id)}`,
  quote: (id: string) => `/quotes?open=${encodeURIComponent(id)}`,
} as const;
export type AgentRecordType = keyof typeof AGENT_RECORDS;

// SECTIONS — every page section the agent can scroll to or highlight.
// Add `data-section="<key>"` to the matching DOM element.
export const AGENT_SECTIONS = {
  "overdue-invoices": "Overdue invoices list",
  "todays-jobs": "Today's scheduled jobs",
  "revenue-kpis": "Revenue KPI cards",
  "workforce-status": "Workforce clock-in status",
  "recent-customers": "Recently active customers",
  "ai-briefing": "Daily AI briefing panel",
  "pending-quotes": "Pending quotes awaiting response",
} as const;
export type AgentSection = keyof typeof AGENT_SECTIONS;

export const isRoute = (k: string): k is AgentRoute => k in AGENT_ROUTES;
export const isRecord = (k: string): k is AgentRecordType => k in AGENT_RECORDS;
export const isSection = (k: string): k is AgentSection => k in AGENT_SECTIONS;
