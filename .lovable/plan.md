

# Foreman AI Mobile Home Screen — Premium iOS Redesign

## What Changes

Rewrite `GeorgeWelcome.tsx` mobile layout from a centered, icon-heavy layout to a structured, information-dense iOS-style dashboard. Also update `GeorgeMobileHeader.tsx` to include the greeting and remove the large avatar from the welcome screen. Update `GeorgeMobileInput.tsx` styling to pill shape.

## Design

```text
┌─────────────────────────────────┐
│ ☰  🪖 Foreman AI    🔔  👤    │  ← existing header (compact)
├─────────────────────────────────┤
│ Good morning, John              │  ← 22px semibold, left-aligned
│ Tuesday, 1 April                │  ← 13px muted
├─────────────────────────────────┤
│ • Needs attention               │  ← section header + red dot
│ ┌──────────┐ ┌──────────┐      │
│ │🔴 €301K  │ │🟡 100    │ ───► │  ← horizontal scroll cards
│ │ overdue  │ │ drafts   │      │     160px wide, colored left border
│ └──────────┘ └──────────┘      │
├─────────────────────────────────┤
│ Quick actions                   │
│ ┌──────┐ ┌──────┐              │
│ │ 📅   │ │ 📆   │              │  ← 2×2 grid, ~90px tall
│ │Today │ │Week  │              │     icon in green-tinted circle
│ ├──────┤ ├──────┤              │
│ │ 📄   │ │ 🧾   │              │
│ │Quote │ │Inv.  │              │
│ └──────┘ └──────┘              │
├─────────────────────────────────┤
│ Today                           │
│ ┌─ 3 jobs ─┬─ €2.4K ─┬─ 1 ──┐ │  ← daily snapshot card
│ │scheduled │invoiced │appt  │ │
│ └──────────┴─────────┴──────┘ │
├─────────────────────────────────┤
│ 📷  Ask Foreman anything... 📞 │  ← pill input, 48px, #F0F0F5
└─────────────────────────────────┘
```

## Implementation

### 1. Rewrite `GeorgeWelcome.tsx` mobile return

**Greeting section** — Replace the large ForemanAvatar + centered text with:
- Left-aligned greeting: "Good morning/afternoon/evening, [Name]" in `text-[22px] font-semibold` 
- Date below in `text-[13px] text-muted-foreground`
- Time-of-day logic: hour < 12 = morning, < 17 = afternoon, else evening

**Needs Attention section** — Horizontal scroll strip:
- Section header: "Needs attention" `text-[15px] font-semibold text-muted-foreground` with a small red dot (`w-2 h-2 rounded-full bg-red-500`) if items exist
- Overdue card: `w-40 min-w-[160px]` white bg, `rounded-[14px]`, `shadow-[0_1px_3px_rgba(0,0,0,0.04)]`, 3px red left border (`border-l-[3px] border-red-500`), AlertTriangle icon 24px red, bold metric `text-[20px] font-bold tabular-nums`, description `text-[13px] text-muted-foreground`, ChevronRight
- Draft quotes card: same but amber left border, TrendingUp icon amber
- Horizontal scroll container: `flex gap-3 overflow-x-auto scrollbar-hide snap-x pb-1`
- Each card tappable → fires `onQuickAction` with the relevant message
- If no urgent items, hide this section entirely

**Quick Actions section** — 2×2 compact grid:
- Section header: "Quick actions" `text-[15px] font-semibold text-muted-foreground`
- Grid: `grid grid-cols-2 gap-2`
- Each card: `~90px tall`, white bg, `rounded-[14px]`, subtle shadow, centered layout
- Icon: 44px container with `bg-[#E8F5EE]` (green tint), `rounded-full`, icon 20px in primary color
- Label below: `text-[14px] font-medium`
- 4 fixed actions: Today's jobs, Week ahead, Create quote, Create invoice
- `active:scale-[0.97]` press feedback

**Daily Snapshot section** — Single card with 3 columns:
- Header: "Today" `text-[15px] font-semibold text-muted-foreground`
- Card: white, `rounded-[14px]`, 3 equal columns divided by `border-r border-border`
- Each column: metric `text-[18px] font-bold tabular-nums` + label `text-[12px] text-muted-foreground`
- Data: jobs scheduled today, invoiced amount today (from existing query or placeholder), upcoming count
- Add a query for today's invoiced amount (sum of invoices created today)

**Spacing**: 16px (`gap-4` / `space-y-4`) between sections, `px-5` horizontal padding

### 2. Update `GeorgeMobileInput.tsx` styling

- Input bar container: change `rounded-2xl` to `rounded-3xl` (pill shape, ~24px radius)
- Background: `bg-[#F0F0F5]` instead of `bg-muted/50`
- Height: ensure `min-h-[48px]`
- Phone button: add `bg-primary` filled circle (already done), keep current behavior
- Camera/photo button: keep on left

### 3. No changes to `GeorgeMobileHeader.tsx`

The header already has the compact format with menu + Foreman AI pill + notifications + avatar. No changes needed — the greeting moves into the welcome content area instead of the header.

### 4. Desktop layout

No changes to desktop — only the mobile `isMobile` branch in `GeorgeWelcome.tsx` is rewritten.

## Files

| Action | File |
|--------|------|
| Rewrite | `src/components/george/GeorgeWelcome.tsx` — mobile layout: greeting + attention cards + 2×2 grid + daily snapshot |
| Edit | `src/components/george/GeorgeMobileInput.tsx` — pill shape input bar |

No database changes. No new files. All existing data queries reused.

