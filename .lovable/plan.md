## Two issues, two fixes

### Issue 1 — Why she didn't get an email

`nitabarimbing@gmail.com` already has a verified revamo account from **2026-03-29** (over a month old). When an existing user submits the signup form again, Supabase Auth silently does nothing and does NOT resend a verification email — that's the platform's anti-enumeration behaviour. There is nothing wrong with the email infrastructure for this case.

The "Check your inbox" page makes this confusing because it implies an email was definitely sent. We'll add a clear note on that screen that points existing users to **Sign in** instead.

### Issue 2 — Strip every remaining `foreman` reference

Found 8 user-visible references to `foreman.ie` / `support@foreman.ie` / `noreply@notify.foreman.ie` across the app. All get replaced with revamo equivalents (`support@revamo.ai`, `revamo.ai`).

## Changes

### 1. `src/pages/VerifyEmail.tsx`

- **Remove** the line `(sender: noreply@notify.foreman.ie)` from the spam-folder hint.
- **Add** a second info box: *"Already have a revamo account with this email? Sign in instead — no new email is sent for existing accounts."* with a link to `/login`. This directly addresses what just happened with nitabarimbing.

### 2. `src/pages/Terms.tsx` (line 123)
`support@foreman.ie` → `support@revamo.ai`

### 3. `src/pages/Privacy.tsx` (lines 32, 116, 158)
All three `support@foreman.ie` → `support@revamo.ai`

### 4. `src/pages/SubscriptionConfirmed.tsx` (line 182)
`contact support@foreman.ie` → `contact support@revamo.ai`

### 5. `src/hooks/useUpgradePrompts.ts`
- `WEB_BILLING_URL`: `https://foreman.ie/settings?tab=team-billing` → `https://revamo.ai/settings?tab=team-billing`
- Native CTA `"Manage on foreman.ie"` → `"Manage on revamo.ai"`
- All 4 `"Visit foreman.ie..."` strings → `"Visit revamo.ai..."`

### 6. `src/pages/SelectPlan.tsx` (lines 34, 40, 43)
- Description: `Visit foreman.ie ...` → `Visit revamo.ai ...`
- Button URL: `https://foreman.ie/...` → `https://revamo.ai/...`
- Button label: `Open foreman.ie` → `Open revamo.ai`

### 7. `src/pages/Pricing.tsx` (lines 65, 67)
- Button URL: `https://foreman.ie/settings` → `https://revamo.ai/settings`
- Button label: `Open foreman.ie` → `Open revamo.ai`

### 8. `src/pages/AppStoreAssets.tsx` (lines 330, 334)
`foreman.ie/privacy` → `revamo.ai/privacy`, `foreman.ie/terms` → `revamo.ai/terms`

## Out of scope (intentionally left alone)

- `supabase/functions/_shared/email-config.ts` — `EMAIL_FALLBACK_*` constants pointing at `foreman.ie` and `notify.foreman.ie` are the safety net documented in memory (`mem://brand/rename-history`). They're not user-visible — they only fire if `notify.revamo.ai` sending breaks. Leaving them alone is correct.
- `src/hooks/useUpgradePrompts.ts` references to `foreman` only in `WEB_BILLING_URL` and copy — already covered above.
- iOS bundle ID and other non-visible foreman strings stay as-is per the rename-history memory.

## Files

**Edited (8)**
- `src/pages/VerifyEmail.tsx`
- `src/pages/Terms.tsx`
- `src/pages/Privacy.tsx`
- `src/pages/SubscriptionConfirmed.tsx`
- `src/hooks/useUpgradePrompts.ts`
- `src/pages/SelectPlan.tsx`
- `src/pages/Pricing.tsx`
- `src/pages/AppStoreAssets.tsx`