
## Goal

Three things in one pass:

1. **Fix Nita now** — send her a password reset so she can get in.
2. **Existing-email detection on signup** — already-registered users get redirected to login with a clear message instead of being told a verification email was sent.
3. **Account-sharing & sketchy-signup detection** — flag/notify on concurrent sessions, the same email being attached to multiple companies, and suspicious signup patterns. Force re-login on other devices when sharing is detected. Email you (rorourke@revamo.ai) when something sketchy happens.

---

## What's already in place

- `profiles.team_id` ties each user to one company. A user can currently appear in `team_members` for multiple teams.
- `email_send_log` + `send-transactional-email` infrastructure is live — we can send branded emails to you.
- Signup flow: `src/pages/Signup.tsx` → `useAuth.signUp` → `supabase.auth.signUp`. No pre-flight email check.
- No session tracking, no admin alerting, no concurrent-session detection today.

---

## Plan

### Part A — Fix Nita (one-off, immediate)

Trigger a password reset email for `nitabarimbing@gmail.com` via Supabase admin so she can sign in right now. No code change.

### Part B — Existing-email detection on signup (option 1 from earlier)

**New edge function `check-email-exists`** (`verify_jwt = false`)
- POST `{ email }` → `{ exists: boolean }`.
- Uses service-role admin client to look up the email.
- **Fails open** on any internal error (returns `{ exists: false, fallback: true }`) so a broken check never blocks signup.
- Logs errors server-side only.

**`src/pages/Signup.tsx`** — pre-flight check in `handleSubmit`
- Before `signUp`, invoke `check-email-exists`.
- If `{ exists: true }` → toast "An account with this email already exists" and `navigate('/login?email=<encoded>&existing=1')`.
- If the call throws/times out → swallow and continue with normal signup (fail open).

**`src/pages/Login.tsx`** — handle `?existing=1`
- Pre-fill email from `?email=`.
- Show an info banner: "An account with this email already exists. Sign in below, or reset your password if you've forgotten it."
- Banner clears when the user types.

### Part C — Account sharing detection + admin alerts

**New table `auth_sessions`** — one row per active session
- `user_id`, `session_token_hash`, `ip`, `user_agent`, `country` (from Cloudflare/IP header), `created_at`, `last_seen_at`, `revoked_at`.
- RLS: users can read their own; service role writes.

**New table `security_events`** — audit log of sketchy events
- `event_type` (`concurrent_sessions` | `suspicious_signup` | `multi_company` | `forced_signout`), `user_id` (nullable), `email`, `details` (jsonb), `ip`, `created_at`.
- Read-only to admins; service role writes.

**New edge function `track-session`** (called from client right after login)
- Inserts/updates `auth_sessions` for the current user.
- **Concurrent-session check**: if the same `user_id` has another non-revoked session with a different `ip`/`user_agent` active in the last 5 minutes → mark older sessions `revoked_at = now()`, insert a `concurrent_sessions` row in `security_events`, and call `send-transactional-email` to alert you.
- Result: latest login wins; other devices get signed out on next auth refresh (client listens to `onAuthStateChange` and forces logout if `revoked_at` is set on its session row).

**New edge function `check-suspicious-signup`** (called by Signup.tsx alongside `check-email-exists`)
- Inputs: email, IP (from request headers).
- Flags any of:
  - 3+ signups from the same IP in the last 24h (different emails).
  - Disposable email domain (small built-in deny-list: mailinator, tempmail, guerrillamail, 10minutemail, yopmail, etc.).
  - Email matches an entry in `burned_accounts` (already exists in your project).
- On flag: insert `suspicious_signup` into `security_events` and email you. **Does not block** the signup — just notifies. (Matches your "notify me + force re-login" enforcement choice; signups aren't auto-blocked, only flagged.)

**One-email-multiple-companies detection**
- Add a unique partial index — or a `BEFORE INSERT` trigger — on `team_members` that prevents the same `user_id` (or same lowercased auth email) from being added to a second active team. If attempted, the trigger raises an exception AND inserts a `multi_company` row in `security_events` and queues an email to you. The actor gets a clean error: "This email already belongs to another company. Use a different email or contact support."

**New transactional email template `security-alert`**
- One template, branded Revamo, takes `{ eventType, email, ip, country, userAgent, details, occurredAt }`.
- Sent to `rorourke@revamo.ai`.
- Triggered from `track-session` (concurrent sessions) and `check-suspicious-signup` (suspicious signup pattern). Per your selection, those are the two events that email you. Multi-company attempts are logged to `security_events` but only emailed if you also want — leaving emailing on by default since they're rare and high-signal; easy to mute later.

**Client wiring**
- `useAuth` calls `track-session` immediately after a successful login/session refresh.
- `useAuth` subscribes to its own `auth_sessions` row via realtime; if `revoked_at` becomes non-null → sign out + toast: "You've been signed out because this account just signed in on another device."

---

## Files touched

**New**
- `supabase/functions/check-email-exists/index.ts`
- `supabase/functions/check-suspicious-signup/index.ts`
- `supabase/functions/track-session/index.ts`
- `supabase/functions/_shared/transactional-email-templates/security-alert.tsx`

**Edited**
- `supabase/functions/_shared/transactional-email-templates/registry.ts` (register `security-alert`)
- `supabase/config.toml` (`verify_jwt = false` for the three new public-ish functions where needed)
- `src/pages/Signup.tsx` (pre-flight checks)
- `src/pages/Login.tsx` (existing-email banner)
- `src/hooks/useAuth.ts` (track session on login, listen for forced revoke)

**DB migration**
- New tables `auth_sessions`, `security_events` with RLS.
- Trigger / unique index on `team_members` to enforce one-email-one-company.

**One-off**
- Send password reset to nitabarimbing@gmail.com.

---

## Tradeoffs you should know

- **Anti-enumeration**: Part B intentionally lets attackers learn whether an email is registered. Standard practice for B2B SaaS. Mitigated later with per-IP rate limiting if needed.
- **Concurrent-session false positives**: Same user on phone + laptop on different networks will trigger a forced re-login on the older device. That matches "latest login wins" — but legitimate dual-device users will feel it. We can later allow-list trusted device fingerprints if it gets noisy.
- **Email volume to you**: Concurrent-session events can be chatty. The template includes the event type in the subject so you can filter; if it gets noisy we'll add a per-user cooldown (e.g. max 1 alert per user per hour).
- **Multi-company block is hard**: existing users who are legitimately in two teams (if any) will need cleanup before the trigger goes live. We'll check for any current dupes in the migration and report them before enabling the constraint.
