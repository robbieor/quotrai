# Launch Readiness Audit — Revamo

You're launching this week. I've audited the app top-to-bottom. Here's exactly what to fix, ranked by risk. **Nothing is broken-broken**, but there are 4 must-fix items, ~6 should-fix, and one big AI verification pass.

---

## 🔴 MUST FIX BEFORE LAUNCH (4)

### 1. `/jobs` and `/calendar` are unprotected routes (security)
In `src/App.tsx`:
```tsx
<Route path="/jobs" element={<Jobs />} />              // ❌ no guard
<Route path="/calendar" element={<JobCalendar />} />   // ❌ no guard
```
Every other operational page has `<RoleGuard>`. Logged-out users can hit these and either crash or see empty/error states. Same goes for `/notifications`, `/time-tracking`, `/settings` — they rely on `useAuth` internally but don't use the standard guard. **Fix:** wrap all six in `<RoleGuard>` like the rest.

### 2. "Reset functionality coming soon" toast in production
`src/hooks/useTemplates.ts:412` — `useResetToDefault` literally does nothing but show a "coming soon" toast. If this hook is wired to a button, users will click it and see a launch-killing message. **Fix:** either implement the reset (delete user-edited copy of system template) or hide the button that triggers it.

### 3. Demo chat on landing page is fully scripted (loops same 4 responses)
The session replay shows the same 4 canned answers repeated 6+ times. Real prospects will spot this in 30 seconds. The demo's value depends on it feeling alive. **Fix options:**
- (a) Wire `DemoChat` to `george-chat` edge function with a 3-message anonymous quota (already partially set up — `MAX_DEMO_MESSAGES = 3`), OR
- (b) Add 8-12 more scripted variations + a "Sign up for the real thing" hard stop after 3 messages so the loop never repeats visibly.

I recommend (a) — it's what the AI marketing claim demands.

### 4. `track-session` not firing — `auth_sessions` table is empty (0 rows)
We deployed the security infra, but no sessions are being recorded for live users (5 profiles exist, 0 sessions tracked). The hook in `useAuth.ts:74` fires `.catch(console.warn)` and swallows the error silently. **Fix:** check edge function logs for `track-session` invocation errors and confirm the function deployed correctly. Without this, your concurrent-session detection is dead on arrival.

---

## 🟡 SHOULD FIX (6)

5. **`ConnectProducts.tsx:136` TODO** — uses raw `accountId` in storefront URL instead of slug. Works but ugly for users sharing the link.
6. **Demo chat unused state warnings** — React forwardRef warnings in `DemoChat` and `ExitIntentPopup` (console). Cosmetic but visible to anyone with devtools open.
7. **`/notifications`, `/settings`, `/time-tracking` lack `<RoleGuard>`** — they auth internally but the inconsistency causes flicker on slow loads.
8. **`/funnel` (FunnelAnalytics) has only `<RoleGuard>` not admin-only** — internal /funnel dashboard per your memory should be owner-only. Add a role check (admin/owner).
9. **`SubscriptionConfirmed.tsx` and `BrandingSettings.tsx`** flagged for hardcoded examples (IBAN, AIB bank string as placeholder). Confirm placeholders aren't being saved as defaults.
10. **`/onboarding` route now just redirects to `/dashboard`** — fine, but `OnboardingModal` triggers off profile state. Verify a brand new signup actually sees it (test with a fresh email end-to-end).

---

## 🟢 AI AGENT VERIFICATION (priority — you said 100%)

The agent surface area is large. Here's the systematic test pass I'll run:

### Backend (82 edge functions deployed)
- ✅ No 5xx errors in last edge logs window — clean
- 🧪 **Smoke test these 8 critical endpoints** via curl: `george-chat`, `george-webhook`, `foreman-chat`, `foreman-rewrite`, `george-photo-quote`, `run-task`, `generate-briefing`, `elevenlabs-agent-token`
- 🧪 Run `sync-agent-tools` once and confirm all 62 tools push to ElevenLabs agent (per your memory)
- 🧪 Verify `LOVABLE_API_KEY`, `ELEVENLABS_API_KEY`, `STRIPE_SECRET_KEY`, `RESEND_API_KEY` secrets all present

### Frontend AI flows (test in preview browser)
| Flow | Test |
|---|---|
| Cmd+K command bar | Type "create quote for Patterson 1300" → check preview gate → confirm |
| `/ask` page | Ask "Top 5 customers by revenue" → response streams + Save as Insight works |
| `/foreman-ai` chat | Multi-turn conversation, history persists on refresh |
| Voice agent (ActiveCallBar) | Start call → speak → hangup → minutes deducted |
| Photo-to-quote | Upload 2 photos → quote generated with line items |
| Daily briefing (5 PM trigger) | Manually invoke `generate-briefing` and check email |
| Proactive nudges | Invoke `generate-nudges` → cards appear on dashboard |

### Workflows by page (button-by-button sweep)

I'll click through every CTA on these pages in the preview using the browser tool: **Landing, Login, Signup, Dashboard, Jobs, Quotes, Invoices, Customers, Calendar, Time Tracking, Reports, Settings, Foreman AI, Briefing, Ask, Automations, Voice Usage, Templates, Documents, Certificates, Price Book, Expenses, Leads, Notifications, Customer Portal**.

For each I check: navigation works, form submits succeed, dialogs open & close, empty states are sensible, mobile (402px) layout doesn't break, error states don't show raw stack traces.

---

## EXECUTION ORDER (when you approve)

```text
Phase 1 — Code fixes (15 min)
  1. Wrap /jobs, /calendar, /notifications, /settings, /time-tracking in <RoleGuard>
  2. Remove or implement useResetToDefault (and hide its button)
  3. Add admin gate to /funnel
  4. Fix DemoChat & ExitIntentPopup forwardRef warnings

Phase 2 — Demo chat upgrade (20 min)
  5. Wire DemoChat to george-chat with 3-message anon quota OR expand scripted variations to 12+

Phase 3 — AI agent verification (30 min)
  6. Smoke-test 8 critical edge functions via curl
  7. Run sync-agent-tools and verify tool count
  8. Test 7 frontend AI flows in browser
  9. Investigate why auth_sessions is empty — fix track-session

Phase 4 — Full button sweep (45 min)
  10. Browser-test every page listed above at desktop + mobile viewport
  11. Flag any broken/dead/stale UI in a final report
```

Total: ~2 hours of focused work. Everything reversible.

**Approve this and I'll start with Phase 1, then report back after each phase before continuing.** If you want to skip the demo chat upgrade (keep scripted) or the full button sweep (just AI verification), say so and I'll trim the plan.