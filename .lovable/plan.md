

# Access Control Audit — Findings & Fix Plan

## Current State: Two Parallel Systems, Neither Complete

You have **two identity systems running side by side** that don't talk to each other:

| System | Table | Stores | Used By |
|--------|-------|--------|---------|
| Legacy | `team_memberships` | `role` (ceo/owner/manager/member) | RLS policies (`is_member_of_team`, `is_owner_or_manager_of_team`), `get_user_team_role()` RPC |
| V2 | `org_members_v2` | `role` (text) + `seat_type` (lite/connect/grow) | `get_user_seat_type()` RPC, frontend `useSeatAccess` hook |

**The problem**: Your RLS policies use the **legacy** system. Your frontend feature gating uses the **V2** system. They're not synced.

---

## Critical Gaps Found

### 1. Role guard is UI-only — no RLS enforcement for members

`RoleGuard` redirects members away from `/dashboard`, `/quotes`, `/invoices` etc. **But at the database level**, there's nothing stopping a member from querying financial data.

- **Quotes**: RLS requires `is_owner_or_manager_of_team(team_id)` — ✅ members CAN'T read quotes at DB level
- **Invoices**: Same — ✅ members CAN'T read invoices at DB level
- **Payments**: Same — ✅ blocked
- **BUT**: `customers`, `jobs`, `templates`, `time_entries`, `job_sites` all use `is_member_of_team()` — ✅ members CAN access these (correct, they need jobs/time)

**Verdict: RLS is actually decent for the owner-vs-member split.** The financial tables (invoices, quotes, payments, expenses) are already locked to owner/manager at DB level. The UI guard is redundant but harmless.

### 2. `get_user_team_role()` doesn't know about `ceo`

The DB function returns from `team_memberships` which has roles: `ceo`, `owner`, `manager`, `member`. But the frontend TypeScript type is `"owner" | "manager" | "member"`. If a user has role `ceo`, the frontend treats it as `null` (no match), and `isTeamSeat` becomes `false`, `isOwner` becomes `false`. The user falls through all guards.

**Current data**: 3 users have `ceo` role, 2 have `owner`. Those 3 CEO users are getting undefined role behavior.

### 3. Seat type gating is frontend-only for most features

`useSeatAccess` checks `get_user_seat_type()` and gates navigation. But the RLS policies don't check seat type **except for `leads`**. A Lite seat user could theoretically call `supabase.from('expenses').select()` directly and get data if they're an owner/manager — the DB doesn't care about seat type for expenses.

**However**: Edge functions like `george-chat` DO check seat type server-side. So the AI features are properly gated.

### 4. No `member` or `manager` rows exist in `org_members_v2`

All 5 rows in `org_members_v2` have `role = 'owner'`. This means `get_user_seat_type()` returns `'connect'` (the COALESCE default) for any non-owner team member. **Every invited team member gets Connect-level access by default regardless of what seat they were assigned.**

### 5. Team invitation doesn't write to `org_members_v2`

When a team member is invited (via `team_memberships`), no corresponding `org_members_v2` record is created. The V2 billing system is completely disconnected from actual team operations.

---

## Fix Plan — Priority Order

### Fix 1: Map `ceo` to `owner` in `get_user_team_role()`

Update the database function so `ceo` is treated as `owner`:

```sql
CREATE OR REPLACE FUNCTION public.get_user_team_role()
RETURNS team_role
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE WHEN role = 'ceo' THEN 'owner'::team_role ELSE role END
  FROM team_memberships
  WHERE user_id = auth.uid()
  LIMIT 1
$$;
```

Also update `is_owner_or_manager_of_team` to include `ceo`:
```sql
-- Already includes 'ceo' ✅ (confirmed in the function definition)
```

### Fix 2: Sync `org_members_v2` on team member invite

**Edit** `supabase/functions/send-team-invitation/index.ts` (or wherever `team_memberships` INSERT happens) to also insert into `org_members_v2` with the correct `seat_type` based on what the owner selected.

**Create a database trigger** as a safety net:
```sql
CREATE OR REPLACE FUNCTION sync_team_membership_to_org_v2()
RETURNS TRIGGER ...
-- On INSERT to team_memberships, upsert into org_members_v2
```

### Fix 3: Update frontend `useUserRole` to handle `ceo`

**Edit** `src/hooks/useUserRole.ts`:
- Add `ceo` to the `TeamRole` type
- Map `isOwner` to `role === "owner" || role === "ceo"`
- Map `isOwnerOrManager` to include `ceo`

### Fix 4: Restrict expenses/documents at RLS level by seat type (optional, low priority)

The current approach (UI gating + edge function checks) is acceptable for launch. True RLS-level seat gating would add complexity without much security benefit since the data is already team-scoped. **Recommend: skip for now.**

### Fix 5: Settings visibility for members

**Edit** `src/pages/Settings.tsx` to hide billing/team tabs from `member` role users. Members should only see their own profile settings, not subscription details or team management.

---

## File Summary

| Action | File |
|--------|------|
| Migration | Fix `get_user_team_role()` to map `ceo` → `owner` |
| Migration | Create trigger to sync `team_memberships` → `org_members_v2` |
| Edit | `src/hooks/useUserRole.ts` — handle `ceo` role |
| Edit | `src/pages/Settings.tsx` — hide billing tabs from members |
| Edit | Team invitation flow — write to `org_members_v2` with seat_type |

No RLS policy changes needed — the existing policies are correctly structured. The main issue is the **two-system desync** and the `ceo` role not being recognized.

