

# Growth Acceleration — 7 High-Impact Changes

**Goal:** 100 paying companies × 5 seats = 500 active users

## Priority 1: Instant Value (Conversion)

### 1A. Interactive Demo Mode on Landing Page
Add a "Try George Now" button on the hero that opens a lightweight chat widget — no signup required. It uses a capped session (3 messages) against the `george-chat` function with a demo system prompt. After 3 messages: "Like what you see? Sign up to keep going."

- **File:** New `src/components/landing/DemoChat.tsx`
- **File:** Edit `src/components/landing/HeroSection.tsx` — add CTA
- **File:** Edit `supabase/functions/george-chat/index.ts` — add anonymous demo mode with message cap

### 1B. Streamline Onboarding to 3 Steps Max
Cut the onboarding from 6+ steps to: (1) Company name + trade, (2) Import or skip, (3) Meet George. Everything else can be progressive — prompted later when contextually relevant.

- **File:** Edit `src/components/onboarding/OnboardingModal.tsx`

## Priority 2: Team Expansion (Revenue per Company)

### 2. Post-Onboarding Team Invite Prompt
After onboarding completes, show a dedicated "Invite Your Team" card on the dashboard. Highlight that their trial includes unlimited seats. Make it 1-tap: enter email → send invite.

- **File:** Edit `src/components/dashboard/OnboardingChecklist.tsx` — add team invite as checklist item #1
- **File:** Edit `src/pages/Dashboard.tsx` — add prominent invite banner for solo users

## Priority 3: Viral Growth

### 3. Referral Program UI
Build a visible referral card: "Give a mate 30 days free, get a month free yourself." Generate shareable link, show referral count. Wire into existing `ref` code system.

- **File:** New `src/components/settings/ReferralCard.tsx`
- **File:** Edit `src/pages/Settings.tsx` — add referral section
- **File:** Migration — `referrals` table to track codes, conversions, rewards

## Priority 4: Retention & Activation

### 4. Activation Email Sequence
Wire the existing `send-drip-email` function into a 5-email sequence triggered by signup:
- Day 0: Welcome + "Meet George"
- Day 1: "Create your first quote in 30 seconds"
- Day 3: "Your business snapshot" (pull real data)
- Day 5: "Invite your team — here's why"
- Day 7: Trial ending — convert or extend

- **File:** New `supabase/functions/check-drip-sequence/index.ts` — cron-triggered drip logic
- **File:** Edit `supabase/functions/send-drip-email/index.ts` — template routing

### 5. Social Proof with Live Stats
Replace placeholder testimonials with a live counter: "X quotes created this week" / "€X invoiced through Foreman." Pull from actual aggregate data (anonymized).

- **File:** Edit `src/components/landing/SocialProofSection.tsx`

## Priority 5: Conversion Optimization

### 6. Exit-Intent / Idle Popup on Landing
If user scrolls 70%+ of landing page without clicking CTA, show a subtle bottom sheet: "Want to see Foreman in action? Watch a 2-min demo" or "Chat with George now."

- **File:** New `src/components/landing/ExitIntentPopup.tsx`
- **File:** Edit `src/pages/Landing.tsx`

### 7. Funnel Analytics Dashboard (Internal)
Build an internal page showing signup → onboarding → first quote → first invoice → payment conversion rates. You need visibility into where users drop off.

- **File:** New `src/pages/FunnelAnalytics.tsx` (admin-only)
- **File:** Edit `src/App.tsx` — add route

## Database Changes

| Table | Purpose |
|-------|---------|
| `referrals` | Track referral codes, conversions, rewards |
| `drip_sequences` | Track which emails have been sent per user |

## No Changes To
- Existing billing/Stripe integration
- George's core AI logic
- Existing auth flow

## Implementation Order
1. Demo chat on landing (biggest conversion lever)
2. Streamline onboarding (reduce drop-off)
3. Team invite prompt (increase ARPU)
4. Drip email sequence (reduce churn)
5. Referral program (viral loop)
6. Social proof + exit intent (polish)
7. Funnel dashboard (measure everything)

