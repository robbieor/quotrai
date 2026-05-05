## The problem

Your friend Nita signed up on revamo.ai and never saw the verification email. Two things are working against you:

1. **The "Check your inbox" page lies about the sender.** It tells people to look for an email from `support@foreman.ie`, but the verification email is actually sent from `revamo <noreply@notify.foreman.ie>`. Anyone searching their inbox for `support@foreman.ie` will find nothing and assume the email never arrived.

2. **Brand confusion.** The website says "revamo", but the email arrives from a `foreman.ie` address. Even when it lands in the inbox, it looks suspicious — easy to dismiss as spam or "not for me".

The auth email *is* being sent (the `notify.foreman.ie` domain is verified and active). The problem is what it looks like and how we tell users to find it.

## Fix — two parts

### Part 1: Fix the "Check your inbox" page (immediate, no DNS needed)

In `src/pages/VerifyEmail.tsx`:
- Replace the misleading `support@foreman.ie` text with the actual sender display: **revamo** (`noreply@notify.foreman.ie`).
- Soften the wording so it focuses on the sender *name* ("revamo") rather than a specific email address — that's what people actually scan for in their inbox.
- Add a clearer "Didn't get it after a minute?" hint pointing to the resend button.

New copy (roughly):

> Can't find it? Check your spam or junk folder. The email comes from **revamo** (noreply@notify.foreman.ie). It usually arrives within a minute.

This single change will solve Nita's problem — she'll know what to search for.

### Part 2 (recommended): Set up `revamo.ai` as a sending domain

Right now every system email — verifications, password resets, magic links, payment receipts, customer quotes — goes out from `foreman.ie`. That's a long-term trust and brand problem, not just for signup.

I'll set up `notify.revamo.ai` as a verified sending domain. Once DNS verifies (usually under an hour), I'll flip a single constant in `supabase/functions/_shared/email-config.ts` plus the two hardcoded constants in `auth-email-hook/index.ts` and `send-transactional-email/index.ts`, redeploy, and every email going forward will come from `revamo.ai`. The "Check your inbox" copy will be updated to match.

This is the proper fix for the brand confusion you've already flagged in memory (`brand/rename-history`).

## Technical details

Files to edit in Part 1:
- `src/pages/VerifyEmail.tsx` — update sender reference text (line 54 area).

Files to edit in Part 2 (after revamo.ai DNS verifies):
- `supabase/functions/_shared/email-config.ts` — flip `EMAIL_FROM_DOMAIN` and `EMAIL_SENDER_DOMAIN` to `revamo.ai` / `notify.revamo.ai`.
- `supabase/functions/auth-email-hook/index.ts` — replace hardcoded `SENDER_DOMAIN` and `FROM_DOMAIN` (lines 40, 42) with imports from `_shared/email-config.ts` so we never have to chase these constants again.
- `supabase/functions/send-transactional-email/index.ts` — same: replace hardcoded constants (lines 12, 16) with the shared import.
- Audit & update remaining `support@foreman.ie` references in `welcome.tsx`, `connect-webhooks/index.ts`, `check-churn/index.ts`, `send-document-email/index.ts` to use `SUPPORT_EMAIL` from the shared config.
- Redeploy: `auth-email-hook`, `send-transactional-email`, `connect-webhooks`, `check-churn`, `send-document-email`.

## What I need from you

Choose one:
- **A. Just fix the page now** — ship Part 1 only. Emails keep coming from `foreman.ie` for now. Quickest unblock for Nita.
- **B. Fix the page AND start the revamo.ai email domain setup** — Part 1 ships immediately; for Part 2 you'll see a "Set up email domain" dialog where you confirm `revamo.ai`, then DNS does its thing in the background and I flip the switch when it's verified.

I'd recommend B — the brand mismatch will keep biting you on every signup, payment receipt and customer-facing email until it's fixed.