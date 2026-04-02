

# Core Workflow Audit — Foreman App

## Audit Results

| Flow | Status | Issues | Fixes |
|------|--------|--------|-------|
| **1. Quote → Job → Invoice** | **Partial** | 4 issues found | See below |
| **2. Job → Calendar → Time Track** | **Working** | 1 minor issue | See below |
| **3. Customer → Job → Invoice** | **Working** | No issues | — |
| **4. Invoice → Paid → Dashboard** | **Partial** | 1 issue | See below |
| **5. Team Member → Assign Job** | **Broken** | No `assigned_to` column on jobs table | See below |
| **6. Expense → Link to Job** | **Working** | No issues | — |

---

## Flow 1: Quote → Job → Invoice

### Path A: Manual conversion (QuoteDetailSheet buttons)
- **Create Quote** → Working. `useCreateQuote` inserts quote + items, sets team_id, generates `Q-XXXX` number.
- **Convert to Job** → Working. `handleConvertToJob` prefills `JobFormDialog` with customer, title, description, estimated_value. User confirms → `createJob.mutate()`.
- **Convert to Invoice** → Working (after previous fix). `CreateFromQuoteDialog` receives `preselectedQuoteId`, auto-selects it. `useCreateInvoiceFromQuote` copies all line items.

### Path B: Auto-create job on quote acceptance
- **`useUpdateQuoteStatus`** → **BROKEN LOGIC (lines 258-262)**. When status is set to "accepted", it attempts to auto-create a job. But:
  1. **Duplicate check is wrong**: `existingJobs` fetches ANY job (`.select("id").limit(1)`) — it doesn't filter by `quote_id`. So it checks if *any* job exists in the system, not whether a job for *this quote* already exists.
  2. **Result is ignored**: The `existingJobs` result is fetched but never used in a conditional — the job is always created regardless.
  3. **Double job creation**: If user accepts a quote (auto-creates job) then also clicks "Convert to Job" in the detail sheet, two duplicate jobs are created for the same quote.

### Path B → Invoice gap
- **`useCreateInvoiceFromQuote` (line 172-186)** does NOT set `currency` on the new invoice. The `useCreateInvoice` hook does resolve currency from customer country, but `useCreateInvoiceFromQuote` skips this. Result: invoice created from quote has `null` currency — falls back to default but inconsistent with direct invoice creation.

### Fixes
1. **Fix duplicate job check**: Change line 259-262 to filter by `quote_id` — `supabase.from("jobs").select("id").eq("quote_id", id).limit(1)` — and skip insert if a match exists.
2. **Add currency to `useCreateInvoiceFromQuote`**: After fetching the quote, resolve customer country and set currency on the invoice insert.

---

## Flow 2: Job → Calendar → Time Track

- **Create Job with date** → Working. Job appears on calendar via `scheduledJobs` filter.
- **Calendar drag-and-drop** → Working. `handleDropJob` calls `updateJob.mutate()` with new `scheduled_date` and `scheduled_time`.
- **Empty slot click** → Working. Opens `ScheduleJobPicker` or `JobFormDialog` for new job creation.
- **Time tracking** → Working. `ClockInOutCard` lists jobs, user selects one, clocks in. `useClockIn` inserts `time_entries` row linked to `job_id`.
- **Minor**: No direct "Start Timer" button from the calendar view — user must navigate to `/time-tracking` separately. This is a UX friction point, not a data flow break.

---

## Flow 3: Customer → Job → Invoice

- **Create Customer** → Working. `useCreateCustomer` inserts with team_id.
- **Create Job with customer** → Working. `JobFormDialog` has customer select dropdown populated by `useCustomers()`.
- **Create Invoice with customer** → Working. `InvoiceFormDialog` has customer select. Customer data flows through to PDF and portal.
- **Full chain intact**: customer_id is a foreign key on both jobs and invoices tables.

---

## Flow 4: Invoice → Paid → Dashboard

- **Create Invoice** → Working.
- **Mark as Paid**: Two paths exist:
  - `useUpdateInvoiceStatus({ id, status: "paid" })` — updates status directly.
  - `PaymentTrackerSheet` → records individual payments via `useCreatePayment`.
- **Dashboard reflection** → **PARTIAL**. `useDashboardStats` calculates `revenueThisMonth` by filtering invoices with `status === "paid"` AND `issue_date` within the current month. Problem: if the invoice was *issued* last month but *paid* this month, it won't count toward this month's revenue. The filter should use `paid_date` or `updated_at` when status is paid, not `issue_date`.
- **Dashboard invalidation** → `useUpdateInvoiceStatus` invalidates `["invoices"]` but does NOT invalidate `["dashboard-stats"]`. The dashboard won't refresh until the user navigates away and back.

### Fixes
1. Add `queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })` to `useUpdateInvoiceStatus.onSuccess` and `useCreatePayment.onSuccess`.
2. Consider adding a `paid_at` timestamp column for accurate revenue reporting (optional but recommended).

---

## Flow 5: Add Team Member → Assign Job

- **Add Team Member** → Working. `useTeam.ts` has `useSendInvitation` which calls the `send-team-invitation` edge function. Invitation flow → accept → user joins team.
- **Assign Job to Team Member** → **BROKEN**. The `jobs` table has no `assigned_to` or `assigned_user_id` column. The `JobFormDialog` schema does not include an assignee field. There is no UI to assign a job to a specific team member. Jobs are only scoped to the team, not to individuals.

### Fix
1. Add `assigned_to UUID REFERENCES auth.users(id)` column to the `jobs` table via migration.
2. Add an "Assign To" select field in `JobFormDialog` populated by `useTeamMembers()`.
3. Update `useCreateJob` and `useUpdateJob` to persist the `assigned_to` value.
4. Filter calendar and time tracking views by assigned user when relevant.

---

## Flow 6: Expense → Link to Job

- **Create Expense** → Working. `ExpenseFormDialog` includes optional `job_id` select.
- **Expense linked to job** → Working. `useExpenses` query joins `jobs(title)` to display the linked job name.
- **Receipt scan** → Working. `scan-receipt` edge function processes image, returns parsed data.
- **Full chain intact**: `job_id` foreign key on expenses table is nullable, allowing both linked and unlinked expenses.

---

## Summary of Critical Fixes

| # | Issue | Severity | File(s) |
|---|-------|----------|---------|
| 1 | **Duplicate job on quote acceptance** — check queries ANY job, not jobs for this quote; result ignored | Critical | `src/hooks/useQuotes.ts` lines 258-279 |
| 2 | **No `assigned_to` on jobs** — team member assignment is impossible | Critical | DB migration + `JobFormDialog.tsx` + `useJobs.ts` |
| 3 | **Invoice from quote missing currency** | Medium | `src/hooks/useInvoices.ts` line 173-186 |
| 4 | **Dashboard not invalidated on payment/status change** | Medium | `src/hooks/useInvoices.ts`, `src/hooks/usePayments.ts` |
| 5 | **Revenue uses `issue_date` not `paid_at`** | Low | `src/hooks/useDashboard.ts` line 90-93 |

## Implementation Order
1. Fix duplicate job creation logic (quick code fix)
2. Add dashboard cache invalidation (quick code fix)
3. Add currency to invoice-from-quote (quick code fix)
4. Add `assigned_to` column + UI (migration + component changes)
5. Revenue date logic improvement (optional enhancement)

