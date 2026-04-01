

# Quotes Screen — Mobile iOS-Style Redesign

## What Changes

On mobile, replace the data table with a card-based quote list matching the Invoices screen pattern. Add a prominent cold quotes alert card, restyle metrics/filters/search, and add cold quote indicators on list items. Desktop stays unchanged.

## Plan

### 1. Edit `src/pages/Quotes.tsx`

**Import** `useIsMobile` from `@/hooks/use-mobile`, `AlertTriangle` and `ChevronRight` from lucide.

**Compute cold quotes** — add a `useMemo` that counts quotes with status `sent` where `created_at` is 7+ days ago (no response). Also compute total value at risk from those cold quotes.

**Header** (mobile branch):
- "Quotes" 28px bold left-aligned
- "1,000 quotes" count below in 13px muted
- Replace full-width "New Quote" button with 44px green filled circle "+" button on mobile
- Desktop: keep existing layout

**Cold Quotes Alert** (mobile, after header):
- Only show when cold count > 0
- Card with `border-l-[4px] border-red-500`, red `AlertTriangle` icon
- "150 quotes going cold" in 15px semibold
- "No response in 7+ days — €352K at risk" in 13px muted
- Right side: "Chase" outlined button, 32px height, red/destructive variant
- Chase button sets status filter to "sent" to show all sent quotes

**Metrics Row** (mobile):
- 3 cards in horizontal scroll: Pipeline Value (green accent), Acceptance Rate (blue accent), Avg Quote Value (neutral)
- Same styling as Invoices: `min-w-[120px]`, `text-[11px] uppercase tracking-[0.05em]` label, `text-[20px] font-bold tabular-nums` value
- Colored left border per metric type

**Search** (mobile): pill-shaped `rounded-[22px]`, `bg-[hsl(240,10%,96%)]`, 44px height

**Status Filters**: 
- Active pill: `bg-primary text-white` (green filled)
- Inactive: `bg-muted text-muted-foreground`
- `h-9 rounded-[18px]`
- Show counts: "All 1,000" / "Draft 191" etc.

**Quote List** (mobile, replaces table):
- Each quote: ~80px height row
- Left: quote number `text-[15px] font-semibold` + customer name `text-[13px] text-muted-foreground`
- Right: amount `text-[16px] font-semibold tabular-nums` + status badge below
- Cold indicator: small amber dot (6px) next to quote number for sent quotes 7+ days old
- Divider: `border-b border-[#F0F0F5]`
- No checkboxes, no dropdown menus
- Tap opens `handleViewQuote`

**Desktop**: Keep existing table, KPI cards, and layout completely unchanged.

### Files

| Action | File |
|--------|------|
| Edit | `src/pages/Quotes.tsx` — mobile list, header, cold alert, metrics, filters |

No new files. No database changes. Desktop layout unchanged.

