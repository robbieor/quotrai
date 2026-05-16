# GDPR Launch-Blocker Sprint

Goal: clear the legal blockers so Revamo can launch to EU/UK/IE customers without an obvious compliance hole. No cookie banner needed — analytics is server-side only (confirmed).

## What gets built

### 1. Delete account flow (Art. 17 — Right to erasure)
The biggest gap. Privacy policy promises this but the app doesn't deliver it.

- **UI:** Settings → "Danger Zone" card at the bottom with a "Delete my account" button. Confirmation dialog requires the user to type their email to enable the red confirm button.
- **Edge function `delete-account`:**
  - Soft-delete: sets `profiles.scheduled_deletion_at = now() + 30 days`, signs the user out, blocks login for that account during the window.
  - Sends a confirmation email with a "Cancel deletion" magic link valid for 30 days.
  - After 30 days, a daily cron job hard-deletes: cascades team data (if sole owner), cancels Stripe subscription, removes from Resend suppression list, deletes the auth user. If the user is a team member (not owner), only their seat + personal data is removed.
- **Owner safeguard:** If the user owns a team with other members, force them to either transfer ownership or remove members first. Clear error message.

### 2. Signup consent (Art. 6 — lawful basis)
- Add a required checkbox to `Signup.tsx`: *"I agree to the [Terms of Service] and [Privacy Policy]"* with both links opening in new tabs.
- Submit button disabled until checked.
- Same checkbox on the Google OAuth path (shown before redirect, stored in `profiles.consented_at` after first sign-in).

### 3. Privacy policy + Terms fill-in
Fill placeholders in `docs/privacy-policy.md`, `docs/terms.md`, and the live `/privacy` + `/terms` pages.

- Company name, CRO number, registered address → **left as `[TODO]` for now** (user to provide).
- Add **International Transfers** section naming OpenAI, Google (Gemini), ElevenLabs, Stripe as US sub-processors covered by Standard Contractual Clauses + EU-US Data Privacy Framework where applicable.
- Add a **Sub-processors** sub-section with provider, purpose, region, and link to each provider's DPA.
- Add explicit **GPS / location data** section: purpose (time tracking + mileage), retention (90 days for raw pings, aggregated trip data kept until job deletion), how to revoke.
- Add **Customer data (Article 28)** paragraph stating that data uploaded *about* your customers makes Revamo a processor on your behalf, governed by the DPA.

### 4. Data Processing Addendum (DPA)
- New `docs/dpa.md` + `/dpa` page. Standard SCC-aligned DPA template covering: subject matter, duration, nature & purpose, types of personal data, categories of data subjects, processor obligations, sub-processor list, international transfers, security measures, breach notification (72h), audit rights, return/deletion on termination.
- Link to it from Terms ("By using Revamo to process your customers' personal data, you agree to the DPA at /dpa").
- No click-through required — incorporation by reference in Terms is sufficient for SaaS.

### 5. GPS permission prompt (transparency)
- Before the first `geolocation.getCurrentPosition()` call, show a modal: *"Revamo uses your location to verify clock-ins at job sites and track business mileage. Raw GPS pings are deleted after 90 days. You can turn this off any time in Settings → Privacy."*
- Persist consent in `localStorage` + `profiles.location_consent_at`. Time-tracking + mileage features check this flag before requesting OS-level permission.
- Settings → Privacy adds a toggle to revoke (disables time tracking + mileage going forward; doesn't delete historical data — separate "Delete my location history" button does that).

### 6. Privacy controls page
New `/settings/privacy` page consolidating:
- Download my data (already exists — Excel export)
- Delete my account (new)
- Delete my location history (new)
- Marketing email opt-out toggle
- Consent log (when they agreed to Terms, Privacy, GPS)

## Technical details

```text
db changes:
  profiles
    + scheduled_deletion_at  timestamptz null
    + deletion_cancel_token  text null
    + consented_terms_at     timestamptz null
    + consented_privacy_at   timestamptz null
    + location_consent_at    timestamptz null
    + marketing_opt_in       bool default false

edge functions:
  delete-account            (POST: schedule soft-delete + send cancel email)
  cancel-account-deletion   (GET via magic link token)
  hard-delete-scheduled     (cron, daily 03:00 UTC — purges expired soft-deletes)
  delete-location-history   (POST: wipes gps_pings + mileage_trips for user)

new pages:
  src/pages/settings/Privacy.tsx
  src/pages/Dpa.tsx

modified pages:
  src/pages/Signup.tsx                 — consent checkbox
  src/pages/Privacy.tsx                — fill placeholders + new sections
  src/pages/Terms.tsx                  — DPA reference + processor clauses
  src/components/settings/*            — Danger Zone card + Privacy menu entry

new components:
  src/components/settings/DeleteAccountDialog.tsx
  src/components/location/LocationConsentDialog.tsx

guards:
  src/hooks/useLocationConsent.ts      — wraps geolocation calls
```

Auth + Stripe cascade order in `hard-delete-scheduled`:
1. Cancel Stripe subscription (best-effort, log failures, don't block)
2. Cascade team data if sole owner (RLS-protected delete via service role)
3. Add email to suppression list (prevents accidental re-marketing)
4. `supabase.auth.admin.deleteUser(userId)` (cascades profiles via FK)

## Out of scope for this sprint
- Cookie banner (not needed — server-side analytics only)
- SAR self-service export covering AI logs (Article 15 — schedule for first 30 days post-launch)
- RoPA internal document (operational, not user-facing)
- Public sub-processors page (the privacy policy section covers it for launch)
- EU AI Act Art. 22 explainability disclosures (post-launch)

## What I need from you afterwards
Once this is built and approved, you'll need to send me:
1. Revamo Ltd CRO number
2. Registered Irish address
3. DPO contact email (or confirm "privacy@revamo.ai" works)

I'll drop those into the placeholders in one quick edit. Everything else ships without them — the `[TODO]` markers are fine for the build, just not for go-live.

## Estimated effort
~2-3 hours of build time. One migration, two new pages, four edge functions, signup tweak, GPS guard, privacy settings page.