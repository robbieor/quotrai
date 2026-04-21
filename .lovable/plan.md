

## Plan: Welcome email for new users (signup + team invite)

Add a polished, on-brand welcome email that fires when a new user joins — whether they signed up themselves or were added by an owner/admin.

### What you'll get

**1. New "Welcome to Foreman" email**
- Same theme as your auth emails: white background, Foreman logo + tight wordmark, dark navy headings, Primary Green (#00E6A0) CTA, Inter font.
- 2026 SaaS-grade welcome message — short, confident, action-focused. Structure:
  - **Hero:** "Welcome to Foreman, {name}" + one-line positioning ("The AI Operating System for field service.")
  - **3 quick-start cards** (compact rows): Add your first job · Send your first quote · Meet George, your AI foreman
  - **Primary CTA:** "Open your dashboard" → `/dashboard`
  - **Secondary line:** Link to support@foreman.ie
  - Closing line in your foreman voice: "We're glad to have you on the tools."
- Two variants in one template, controlled by a `variant` prop:
  - `self_signup` — "Welcome to Foreman" (verification already done)
  - `team_invite` — "Welcome to {teamName}" + adds inviter line ("{inviterName} added you as {role}.")

**2. Sending infrastructure**
- Scaffold the transactional email system (creates `send-transactional-email`, unsubscribe handler, suppression handler, registry, and an `/unsubscribe` page in the app).
- Register the new template as `welcome` in the transactional registry.
- Reuse the existing email queue (already live — proven by `send-team-invitation`).

**3. Triggers**
- **Self-signup:** After successful email verification, fire welcome email once. Implementation: add a small effect in the post-verification flow (or in `handle_new_user` follow-up via `useAuth` on first authenticated session) that calls `send-transactional-email` with `templateName: 'welcome'`, `variant: 'self_signup'`, idempotency key `welcome-{user.id}`.
- **Team invite:** When an invited user accepts and creates their account (`AcceptInvite.tsx` flow), fire welcome email with `variant: 'team_invite'` + `teamName`, `inviterName`, `role`. Idempotency key `welcome-invite-{user.id}-{teamId}`.
- Idempotency keys guarantee the email only ever sends once per user, even if the trigger fires twice.

### Technical detail

- New file: `supabase/functions/_shared/transactional-email-templates/welcome.tsx` — React Email component, mirrors styling tokens from `signup.tsx` (logo URL, brandName tracking `-0.03em`, button color `#00E6A0`, footer `© Foreman · foreman.world`).
- New file: `supabase/functions/_shared/transactional-email-templates/registry.ts` — exports `TEMPLATES` map with the welcome entry.
- New function: `supabase/functions/send-transactional-email/index.ts` (scaffolded).
- New function: `supabase/functions/handle-email-unsubscribe/index.ts` (scaffolded).
- New function: `supabase/functions/handle-email-suppression/index.ts` (scaffolded).
- New page: `src/pages/Unsubscribe.tsx` + route in `App.tsx`.
- Edits:
  - `src/hooks/useAuth.ts` — after first verified session detected, invoke welcome (self_signup) with idempotency key.
  - `src/pages/AcceptInvite.tsx` (or the post-accept handler in `useTeam.ts`) — invoke welcome (team_invite) after the new user account is created and joined to the team.
- Deploy all new/edited functions in one go.

### What I won't touch

- The 5 existing auth email templates — no styling changes.
- The existing `send-team-invitation` function — the welcome is a separate, post-acceptance email (the invite email still goes out first to ask them to join).

### After implementation

You'll see "Welcome" listed under **Cloud → Emails → App emails** with a live preview, and every send will appear in **Logs**. Test by signing up a fresh email, then by inviting yourself to a team from a second account.

