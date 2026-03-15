

## Plan: Restore Landing Page to Match quotr.work + Add Dashboard Morning Briefing

### Problem
The current landing page has diverged significantly from the published quotr.work version. Key differences:
- **Hero**: Current says "Your AI Office Manager. For Trade Businesses." — should be "Talk to your business. It talks back."
- **Hero CTA**: "Try Free for 30 Days" — should be "Get Founding Member Access" with 30% off messaging
- **Hero right side**: Shows DashboardShowcase — should show the Foreman AI chat widget mockup
- **Nav**: Missing currency selector and ROI Calculator button; CTA says "Start Free Trial" instead of "Get Founding Member Access"
- **Sections removed in published**: Stats counters, DayTimeline, BeforeAfter are NOT on quotr.work
- **Capabilities**: Published has 4 compact cards (Dashboards, GPS, P&L, Xero) — current has 7
- **Customer Portal**: Shows £ — published shows €
- **Missing**: Competitor comparison section (Tradify/Fergus/Jobber/ServiceM8)
- **ROI Calculator**: Should be in nav dialog, not inline
- **Fake trust indicators**: "500+, 4.9/5, 12,000+, €2.1M" must be removed
- **Footer CTA**: Should be "Get Founding Member Access" linking to /request-access

### Implementation

#### 1. Rewrite `src/pages/Landing.tsx` to match quotr.work

**Nav changes:**
- Add currency selector dropdown (flag + symbol) — static for now, defaults to € 
- Add "ROI Calculator" nav button that opens a Dialog with the ROICalculator component
- Change primary CTA to "Get Founding Member Access" linking to /request-access
- Keep Customer Portal and Login links

**Hero changes:**
- Headline: "Talk to your business." / "It talks back." (green gradient)
- Subtitle: "Quotes, invoices, expenses, scheduling, price lists, customer portal — all voice-powered, all in one app. Built for field service pros, not accountants."
- CTA: "Get Founding Member Access" with rocket emoji + "Join the Beta Program to get 30% off — limited places available"
- Right side: Replace DashboardShowcase with a Foreman AI chat mockup widget showing the quote conversation flow

**Remove sections:**
- Stats counters (11 days, 8hrs, 4x, 1-20)
- DayTimeline ("Your Day with Quotr")
- BeforeAfter transformation section

**Keep/adjust sections:**
- "One platform. Zero office staff needed." with Lead→Profit flow pipeline + 4 capability cards (not 7)
- Foreman AI section (keep skills grid + voice commands, add chat demo mockup)
- Customer Portal section (change £ to €)
- Remove inline ROI Calculator section (moved to nav dialog)
- Remove Testimonials section (or keep without fake stats)
- Remove Security & Trust bar
- Pricing section: keep but normalize to € with Lite/Connect/Grow naming from published
- Add competitor comparison section (Tradify, Fergus, Jobber, ServiceM8)
- Footer CTA: "Get Founding Member Access" → /request-access

#### 2. Remove fake trust indicators from `src/components/landing/Testimonials.tsx`
Delete lines 167-188 (the "500+, 4.9/5, 12,000+, €2.1M" block).

#### 3. Fix `src/components/landing/ROICalculator.tsx` currency
Normalize £30/hour → €30/hour and €29/month consistency.

#### 4. Create `src/components/dashboard/MorningBriefingCard.tsx`
A smart, time-aware greeting card at the top of the dashboard:
- Time-based greeting: "Good morning/afternoon/evening, {firstName}"
- AI-style summary pulling from existing dashboard metrics (useDashboardMetrics):
  - Jobs scheduled today count
  - Pending quotes value
  - Overdue invoices count + days
  - Revenue MTD progress
- Subtle gradient card with the Foreman AI avatar, "Online" status indicator
- Quick action buttons: "View Schedule", "Chase Overdue", "Send Quotes"
- Dismissible for the session

#### 5. Add MorningBriefingCard to `src/pages/Dashboard.tsx`
Insert above the metrics row, after OnboardingChecklist.

### Files changed
| File | Action |
|---|---|
| `src/pages/Landing.tsx` | Major rewrite to match quotr.work structure |
| `src/components/landing/Testimonials.tsx` | Remove fake trust indicators |
| `src/components/landing/ROICalculator.tsx` | Normalize currency symbols |
| `src/components/dashboard/MorningBriefingCard.tsx` | New — smart morning briefing |
| `src/pages/Dashboard.tsx` | Add MorningBriefingCard |

No backend, database, or auth changes required.

