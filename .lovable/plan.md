

# Security Blocker Fix — Round 2 (Actually Complete This Time)

## Root Cause of Incomplete Fix

The previous migration **added** team-scoped policies but **did not drop** the existing permissive policies. In Supabase, multiple PERMISSIVE policies are ORed together — so if even one policy says "allow all authenticated users", the restrictive one is meaningless.

## What This Migration Does

### 1. `document-emails` Storage — Drop Old Policies
- DROP `"Users can read document PDFs via signed URLs"` (SELECT, bucket_id only)
- DROP `"Authenticated users can upload document PDFs"` (INSERT, bucket_id only)
- The team-scoped policies from the previous migration remain in effect

### 2. `job_photos` — Drop Anon Read Policy
- DROP any remaining anon SELECT policy with `USING(true)`
- The team-scoped authenticated policy from previous migration stays

### 3. `team_member_profiles` View — Fix Underlying Access
- The view uses `security_invoker = true`, which means RLS on `team_memberships` and `profiles` applies
- `team_memberships` already has team-scoped RLS ✅
- `profiles` likely has a broad SELECT policy — add a team-scoped policy so users can only see profiles of their own team members (via join to `team_memberships`)

### 4. Realtime — Add Policy to `realtime.messages`
- This is a Supabase-managed schema — we **cannot** modify `realtime.messages` directly
- The correct approach: ensure the **source tables** (`location_pings`, `notifications`) have tight SELECT policies (already done), and document that Realtime broadcast/presence channels are not row-filtered
- Mark this as a known limitation with mitigation (table-level RLS blocks the actual data)

### 5. `marketing-assets` Storage — Add Team Scoping
- DROP `"Marketing assets auth upload"` and `"Marketing assets auth delete"`
- Add team-folder-scoped INSERT and DELETE policies matching the `document-emails` pattern

### 6. `cancellation_reasons` — Add SELECT Policy
- Add `SELECT` policy: `user_id = auth.uid()` so users can read their own entries

## Single Migration File

One new migration with all DROP + CREATE statements.

## Files

| Action | File |
|--------|------|
| Create | `supabase/migrations/<timestamp>.sql` — single migration with all fixes |

No frontend code changes needed.

