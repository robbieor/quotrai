## Problem

Two visual issues across the app:
1. **Harsh dark navy** (`#0f172a`, `220 26% 9%`) used as solid backgrounds (sidebar, dashboards, hero sections) reads as heavy/flat next to the new teal "r" logo.
2. **Non-teal greens** (`#0D9B6A` ≈ HSL 155 85% 33%, `#22c55e`, `#0a4a2c`, `emerald-*`) clash with the teal `#0D9488` brand color the logo establishes.

Goal: shift the entire palette to a **teal-led, softer-slate** system that matches the logo, without changing layout.

## Fix

### 1. Rewrite design tokens in `src/index.css`
Replace both `:root` and `.dark` color blocks:

- **Primary** `155 85% 33%` (green) → `173 80% 33%` (teal `#0D9488`)
- **Ring / accent / sidebar-primary** → same teal
- **Sidebar bg** `220 26% 12%` (near-black navy) → `215 28% 17%` (soft slate)
- **Sidebar accent/border** lifted to 22%/26% so hovered items have visible separation
- **Background** `220 14% 96%` (cool grey) → `210 20% 97%` (warmer off-white)
- **Card** light → pure white for clean contrast vs background
- **Chart palette** reordered teal → cyan → blue → indigo → violet (drops the green)
- Add `--primary-glow` (`173 70% 45%`) for gradients
- Soften shadows (use slate-tinted alpha, not pure black)
- Dark mode: lift `--background` from `9%` to `12%` lightness so it's not crushing-black; keep teal accent

### 2. Sweep hardcoded greens → teal/semantic tokens
Files using `bg-green-*`, `text-green-*`, `bg-emerald-*`, `#22c55e`, `#0a4a2c`, `#0D9B6A`:

- `src/components/dashboard/*` (StatCard, MorningBriefingCard, WeekPlanningStrip, RecentActivityFeed, SubscriptionCoveredCard, RecentJobsCard, UpcomingScheduleCard, TeamActivityCard) — swap success greens for `text-primary` / `bg-primary/10`; keep semantic green only for explicit "paid/positive delta" badges where it must read as money-positive (use `bg-emerald-500/15 text-emerald-700 dark:text-emerald-400`, restrained)
- `src/components/billing/*`, `src/pages/Pricing.tsx`, `src/pages/SelectPlan.tsx`, `src/pages/SubscriptionConfirmed.tsx` — primary CTAs and check-marks become `text-primary` / `bg-primary`
- `src/components/calendar/JobCard.tsx`, `src/pages/Jobs.tsx`, `src/pages/Quotes.tsx`, `src/pages/Expenses.tsx`, `src/pages/Notifications.tsx`, `src/pages/FunnelAnalytics.tsx`, `src/pages/AIAuditHistory.tsx`, `src/pages/CustomerDashboard.tsx` — status pills/icons → primary tokens
- `src/components/command/CommandResult.tsx`, `src/components/reports/RevenueExpenseChart.tsx`, `src/components/time-tracking/*` — chart strokes/fills use `hsl(var(--chart-1..5))`
- `src/lib/native.ts`, `src/hooks/useJobs.ts` — replace `#22c55e`/`#0f172a` literals with the teal/slate equivalents
- `src/hooks/useJobs.ts`, calendar event colors → teal family

### 3. Replace hardcoded navy `#0f172a` solid blocks
Hero/landing dark sections currently use `bg-[#0f172a]` or `bg-foreground` over solid black-navy:
- Switch to `bg-sidebar` (now soft slate `215 28% 17%`) or layered gradient `bg-gradient-to-b from-slate-900 to-slate-800` on landing for depth instead of flat near-black.
- Keep readable contrast: white text stays.

### 4. Update memory
Rewrite `mem://brand/foreman-unified-identity` and the Core line:
> Revamo Identity: Soft slate (#1f2937) surfaces, **Primary Teal (#0D9488)** matching the logo, Inter for UI. Teal replaces all non-semantic greens.

## What this will NOT change

- No layout changes
- No copy / component structure changes
- Semantic destructive (red), warning (amber), and explicit money-positive deltas stay distinguishable (restrained emerald)
- Logo, sidebar structure, and Manrope wordmark untouched

## Approve to ship
Reply "go" and I'll switch to build mode and apply tokens + sweep in one pass.