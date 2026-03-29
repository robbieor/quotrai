

## Email Verification & Admin Notification on Signup

### What's happening now
- Auto-confirm is likely enabled, so users skip email verification entirely
- The signup page navigates directly to `/dashboard` after account creation
- The auth email templates (including signup confirmation) exist and are wired up, but verification is bypassed because the account is auto-confirmed

### Plan (4 parts)

---

### 1. Disable auto-confirm for email signups
Use `cloud--configure_auth` (or equivalent) to ensure email auto-confirm is OFF. This forces users to verify their email before they can sign in. The existing `auth-email-hook` + signup template will automatically send the verification email.

### 2. Enhance the signup confirmation email template
Update `supabase/functions/_shared/email-templates/signup.tsx` to be a proper welcome email with:
- Foreman branding (dark navy header with logo — already there)
- Welcome message: "Welcome to Foreman"
- Key getting-started info: create your first quote, add a customer, explore George AI
- The verification button (already exists, just relabel to "Verify & Get Started")
- Brief trust copy (30-day Pro trial, no card needed)

Then redeploy `auth-email-hook`.

### 3. Add email verification interstitial page
Create `src/pages/VerifyEmail.tsx` — shown after signup instead of redirecting to dashboard:
- Branded page with checkmark/email icon
- "Check your inbox" message with the user's email
- "Resend verification email" button
- Link back to login

Update `src/pages/Signup.tsx`:
- After successful signup, navigate to `/verify-email` instead of `/dashboard`
- Pass email via state or query param

Add route in `App.tsx`: `/verify-email` → `VerifyEmail`

### 4. Send admin notification email on new signup
Create an edge function `notify-admin-signup/index.ts` that:
- Is triggered from within `handle_new_user` via a database webhook, OR
- Is called from the auth-email-hook when it processes a `signup` event (simpler approach)

**Chosen approach**: Add admin notification logic directly inside `auth-email-hook/index.ts` when `emailType === 'signup'`. After enqueuing the user's verification email, also enqueue a second email to `support@foreman.ie` containing an HTML table with:
- User's email
- Full name
- Signup timestamp
- Referral code (if present in metadata)
- Subscription tier (Pro trial)
- Trial end date

This avoids creating a new edge function and keeps all signup email logic in one place.

---

### Files to create/modify

| File | Action |
|---|---|
| `supabase/functions/_shared/email-templates/signup.tsx` | Enhance to welcome email with getting-started info |
| `supabase/functions/auth-email-hook/index.ts` | Add admin notification email when type is `signup` |
| `src/pages/VerifyEmail.tsx` | New verification interstitial page |
| `src/pages/Signup.tsx` | Navigate to `/verify-email` instead of `/dashboard` |
| `src/App.tsx` | Add `/verify-email` route |

### Auth config change
- Disable auto-confirm for email signups (so verification email is actually required)

### Deployment
- Redeploy `auth-email-hook` edge function after changes

