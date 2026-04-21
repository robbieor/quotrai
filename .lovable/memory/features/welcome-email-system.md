---
name: Welcome email system
description: Transactional welcome email fired on first verified sign-in (self_signup) or post-invite-accept (team_invite); idempotent via localStorage keys
type: feature
---
Welcome email lives at `supabase/functions/_shared/transactional-email-templates/welcome.tsx` registered in `registry.ts` as `welcome`. Two variants via `templateData.variant`: `self_signup` (default) and `team_invite` (adds inviter line + uses team name in subject). Triggers: (1) `useAuth.ts` SIGNED_IN listener fires self_signup if email verified AND no `pending_invite_token` in sessionStorage, gated by `localStorage[welcome_sent_{userId}]`. (2) `AcceptInvite.tsx` onSuccess fires team_invite, gated by `localStorage[welcome_invite_sent_{userId}_{teamId}]`, and pre-sets `welcome_sent_{userId}` to suppress the self_signup path. Idempotency keys passed to API as `welcome-{userId}` and `welcome-invite-{userId}-{teamId}`. Sender: notify.foreman.ie via send-transactional-email.
