# Foreman AI — Beating Jobber Plan (Receptionist excluded)

## The verdict

Jobber didn't catch up — they caught up to **voice + chat**. They're still behind on **trust, personality, proactivity, trade depth, and photo-to-quote**. With Receptionist parked, the real near-term gap is **Rewrite** (one-click message polish). Everything else is depth and marketing, not capability.

We don't beat them by copying. We ship Rewrite, then **lean into what George does that Jobber can't**.

---

## Phase 1 — Close the one remaining gap

### Rewrite (1-2 days, huge perceived value)

A single "✨ Rewrite" button on every message composer (SMS, email, customer notes, quote/invoice notes, lead replies).

- Edge function `foreman-rewrite` — Gemini 2.5 Flash. Inputs: raw text, tone (Professional / Friendly / Firm / Apologetic), context tag (quote follow-up / overdue chase / new lead reply / generic).
- Inline diff UI — show original vs rewritten, accept/reject, regenerate with different tone.
- Surfaces in: `SendEmailDialog`, message composer in customer detail, lead reply box, quote/invoice notes, comms templates.
- Free for all tiers — it's a hook, not a moat.

---

## Phase 2 — Make our existing wins visible (1 week)

We already do things Jobber doesn't. We just don't market or surface them.

### 2.1 Daily Briefing as a real product

- 7am push notification + email: "Insight: 3 quotes aging past 14 days (€4,200). Impact: close rate drops from 60% to 22% after day 14. Action: send follow-ups now."
- One-tap actions inside the briefing.
- Already partially built (proactive nudges + AI business intelligence engine) — promote to first-class product surface with its own page `/briefing` and consistent morning delivery.

### 2.2 "Ask Foreman" landing surface

George is currently a floating button. Add a dedicated `/ask` page styled like Jobber's chat hero — big input, suggested prompts ("Why are my margins down this month?", "Which customer owes me the most?", "What jobs make me the least money?"), citation-style answers showing which records were used.

### 2.3 Benchmarks (the one thing they explicitly beat us on)

Anonymised cross-team comparisons: "Your average quote-to-cash is 9 days. Median for Irish electricians is 14. You're top quartile."

- Aggregation edge function reading from a new `team_metrics_aggregated` materialised view (no PII, only counts/medians/quartiles by trade + region).
- Surface inline in dashboard, briefing, and Ask answers.

---

## Phase 3 — Suggested Automations (matches their "learns how you run")

A new `/automations` surface where Foreman watches behaviour and proposes rules:

- "You've manually sent 'thanks for paying' messages to 12 customers this month. Automate it?"
- "You always schedule plumbing jobs as 2-hour slots. Apply this default?"
- "Quotes from referrals close 3× more often. Auto-flag and prioritise?"

Pattern detection runs nightly via edge function, surfaces as cards, one-click enable. Each rule writes to a `team_automations` table consumed by existing triggers and the george-webhook engine.

---

## Phase 4 — Differentiation moats (where we go further than Jobber)

### 4.1 Voice agent on speakerphone in the van

Jobber's voice is mobile-app-bound. We already have `voice-agent-hands-free-driving` (silent audio loop + wakeLock). Market it as **"George rides shotgun"** — full demo of a sparkie driving between jobs, asking "what's on for tomorrow", logging materials, sending a quote, all hands-free.

### 4.2 Photo-to-quote in seconds

Jobber doesn't have Gemini Vision photo-to-quote. We do. Surface it on the marketing page, in onboarding, and in a 30-second demo loop.

### 4.3 Live Action Mode confirmation gates

Jobber's automations "just do things". Foreman shows every step before commit. Position as **trust** — "AI that asks before it acts". Ties directly into the Working Visibility Principle already in our memory.

---

## Phase 5 — Marketing reset

Capability is even. Marketing isn't.

- **Rewrite the AI landing page** mirroring Jobber's structure: hero claim → 3 pillars → 5 practical features → testimonial → integrations.
- **Three 30-second loop videos**: photo-to-quote, hands-free driving, daily briefing.
- **Side-by-side comparison page** `/foreman-vs-jobber`: trade-aware (yes/no), region-aware (yes/no), photo-to-quote (yes/no), action gates (yes/no), Irish standards (yes/no), benchmarks (yes/no).
- **Personality angle**: George the Irish foreman vs Jobber's faceless AI. Lean in. It's a moat they can't copy without rebranding.

---

## Suggested sequencing

```text
Week 1:    Rewrite                           ──► immediate user-visible AI win
Week 2:    Daily Briefing surface + /ask     ──► promote what we already do
Week 3:    Benchmarks                        ──► neutralise their data-advantage claim
Weeks 4-5: Suggested Automations             ──► capability parity
Week 6:    Marketing relaunch                ──► tell the story we earned
```

## Files / surfaces this plan would touch

(Implementation-only — not done in this plan)

- New edge functions: `foreman-rewrite`, `automation-pattern-detector`, `team-benchmarks`
- New pages: `src/components/ai/RewriteButton.tsx`, `src/pages/Ask.tsx`, `src/pages/Automations.tsx`, `src/pages/Briefing.tsx` (promoted from dashboard widget)
- New tables / views: `team_automations`, `team_metrics_aggregated` (materialised view, no PII)
- Updated: landing AI page, comparison page, onboarding to include AI tour

## What this plan does NOT do

- Doesn't build AI Receptionist (parked per your call).
- Doesn't try to out-feature Jobber on count. We win on **judgement, trust, and trade depth**.
- Doesn't rebuild what works (george-webhook, voice context, memory architecture).
- Doesn't bloat the agent — every new tool goes through the existing `foreman-tool-definitions.ts` source of truth.

---

**Recommendation**: approve Phase 1 (Rewrite) first — small, ships in days, immediately visible to users. Phase 2 is the highest-leverage follow-up because it monetises capability we already have.
