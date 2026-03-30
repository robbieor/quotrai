

# Access Control Audit — What's Working, What's Missing, What Users Need to Understand

## Current State: Two Systems, Both Functional but Unexplained

You have **two parallel access control dimensions** that both work at the code level but are never explained to users:

### Dimension 1: Role (who you are in the company)
| Role | Code value | What they see |
|------|-----------|---------------|
| CEO/Owner | `ceo` / `owner` | Everything — all nav, all pages, all billing |
| Manager | `manager` | Everything except billing management |
| Member | `member` | Jobs, Calendar, Time Tracking only |

**How it works:**
- `useUserRole()` → calls `get_user_team_role()` RPC
- `RoleGuard` in `App.tsx` → redirects members away from forbidden pages
- `AppSidebar` → filters nav items via `MEMBER_ALLOWED_IDS`
- This is working correctly at the code level

### Dimension 2: Seat Type (what plan each person is on)
| Seat | Price | What it unlocks |
|------|-------|----------------|
| Lite (€19) | Core tools — no AI, no expenses, no reports |
| Connect (€39) | AI, expenses, documents, reports, recurring invoices |
| Grow (€69) | Leads, integrations, advanced reporting, API |

**How it works:**
- `useSeatAccess()` → calls `get_user_seat_type()` RPC
- `SeatGuard` wraps routes in `App.tsx` (Connect: expenses, AI, reports, docs; Grow: leads)
- `PlanGate` wraps dashboard widgets (Grow: profitability scatter, aging chart)
- Owners/managers bypass seat checks via `canAccess()` override
- Server-side: edge functions (`george-chat`, `xero-sync`) validate seat type via `get_user_seat_type_for` RPC

### What's Actually Broken / Missing

1. **No user-facing explanation of roles or seats anywhere.** The `SeatManagementTable` shows role badges and seat dropdowns but never explains what "Lite" vs "Connect" means in terms of access. Users are assigning seats without understanding what they're paying for.

2. **Team invitation flow doesn't let you pick seat type.** When an owner invites someone via `TeamManagement`, they enter an email and hit send. The seat type defaults to `lite` (via the sync trigger). The owner has to go to the *separate* `SeatManagementTable` after to change it. This is a disconnected flow.

3. **Role assignment is invisible.** There's no UI to change a member's role (owner/manager/member). Roles come from `team_memberships.role` set at invite time, but the invite form has no role picker.

4. **The two concepts (role vs seat) are confusing together.** A "member" role on a "Connect" seat can access AI but not invoices. A "manager" role on a "Lite" seat can see everything because managers bypass seat checks. This is counterintuitive and never explained.

5. **SelectPlan page explains plan features but not role restrictions.** Users see what Lite/Connect/Grow include but have no idea that "member" role users can only see Jobs/Calendar/Time Tracking regardless of seat.

---

## Plan: Make Access Control Understandable

### 1. Add a "What's Included" tooltip/panel to SeatManagementTable

In `SeatManagementTable.tsx`, add a collapsible section or info card above the member list:

```text
┌──────────────────────────────────────────────────┐
│  Understanding Seats & Roles                      │
│                                                    │
│  SEAT TYPE controls which features are available:  │
│  • Lite — Jobs, quotes, invoices, scheduling       │
│  • Connect — + AI assistant, expenses, reports     │
│  • Grow — + leads pipeline, integrations, API      │
│                                                    │
│  ROLE controls what data they can see:             │
│  • Owner — Full access, billing, team management   │
│  • Manager — Full access, no billing               │  
│  • Team Member — Jobs, calendar, time tracking     │
└──────────────────────────────────────────────────┘
```

### 2. Add role picker to TeamManagement invite flow

Edit `TeamManagement.tsx` — add a `Select` for role (Owner/Manager/Member) next to the email input when inviting. Pass the selected role to `send-team-invitation`.

### 3. Add seat type picker to TeamManagement invite flow

Same invite form — add a seat type selector (Lite/Connect/Grow) so the owner sets both role AND seat at invite time, not after.

### 4. Add feature access column to SeatManagementTable

Next to each member's seat dropdown, show a compact list of what they can access based on their role + seat combination. E.g., a member on Connect sees "Jobs, Calendar, Time Tracking" (role-limited), not the full Connect feature set.

### 5. Add "What each seat includes" section to SelectPlan

Below the pricing cards on `/select-plan`, add a comparison table showing the intersection of role × seat — so owners understand that buying a Connect seat for a "member" role user won't give them reports access (role blocks it).

---

### File Summary

| Action | File |
|--------|------|
| Edit | `src/components/billing/SeatManagementTable.tsx` — add explainer card + access preview column |
| Edit | `src/components/settings/TeamManagement.tsx` — add role + seat pickers to invite flow |
| Edit | `src/pages/SelectPlan.tsx` — add role × seat explanation section |
| Edit | `supabase/functions/send-team-invitation/index.ts` — accept role + seat_type params |

No database migrations needed — `team_memberships.role` and `org_members_v2.seat_type` already exist.

