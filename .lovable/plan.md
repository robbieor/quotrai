

## Fix Trial Duration: 14 days → 30 days

### Problem
Multiple files incorrectly state "14-day" trial when the actual trial period is 30 days. This was introduced during the Quotr→Foreman rebrand.

### Files to Fix

| File | Current | Fix |
|------|---------|-----|
| `remotion/src/scenes/Scene7Closing.tsx` | "Try Foreman free for 14 days" | → "Try Foreman free for 30 days" |
| `src/components/billing/SubscriptionOverview.tsx` | "Start your 14-day free trial" | → "Start your 30-day free trial" |
| `src/pages/Terms.tsx` | "14-day free trial" | → "30-day free trial" |
| `supabase/functions/send-drip-email/index.ts` | "your 14-day Foreman trial ends soon" | → "your 30-day Foreman trial ends soon" |

### Not Changed (correct usage of "14 days")
- **Payment terms placeholder** in BrandingSettings — "Payment due within 14 days" refers to invoice payment terms, not trial
- **Scene5ConvertJob** — "Due in 14 days" refers to invoice due date, not trial
- **FounderProjections** — "Get paid 14 days faster" is a marketing claim, not trial
- **george-webhook** invoice due date default — business logic, not trial

### Note
The Remotion scene change means the video should be re-rendered to reflect the updated text. However, since re-rendering requires the full Remotion build pipeline, this will be done as a follow-up after the code changes.

