

# Invoices Screen — Mobile iOS-Style Redesign

## What Changes

On mobile, replace the data table with a card-based invoice list. Restyle the header, alert banner, metrics, filters, and search to match the premium design system. Desktop keeps the existing table.

## Plan

### 1. Edit `src/pages/Invoices.tsx` — mobile-responsive layout

**Header** (lines 186-202):
- Mobile: "Invoices" 28px bold left-aligned, "1,000 invoices" count below in 13px muted
- Replace "From Quote" + "New Invoice" buttons with a single 44px green filled circle "+" button on mobile
- Desktop: keep existing two-button layout

**Alert Banner** (replaces `InsightAlerts` on mobile):
- Compute "invoices due within 3 days" count from data
- Render as a compact card: `border-l-[3px] border-amber-500`, amber `AlertTriangle` icon, text in 14px, "Review" green text button on right that sets status filter to "pending"
- Only show when count > 0

**Metrics Row** (lines 207-219):
- Mobile: 3 cards (Overdue, Paid This Month, Avg Days), each `min-w-[120px]`
- Overdue: red text for value, red left accent
- Paid: green accent
- Avg Days: blue accent
- Label: `text-[11px] uppercase tracking-[0.05em] text-muted-foreground`
- Value: `text-[20px] font-bold tabular-nums`
- Cards: `rounded-xl p-3`, subtle shadow

**Search** (lines 221-224):
- Mobile: pill-shaped `rounded-[22px]` with `bg-[hsl(240,10%,96%)]`

**Status Filters** (lines 227-243):
- Change active pill from dark (`bg-foreground`) to green filled (`bg-primary text-white`)
- Inactive: `bg-muted text-muted-foreground`
- Height: `h-9 rounded-[18px]`
- Show counts inside: "All 1,000"

**Invoice List** (mobile only, replaces table):
- Each invoice: 80px height row
- Left: invoice number `text-[15px] font-semibold` + customer name `text-[13px] text-muted-foreground`
- Right: amount `text-[16px] font-semibold tabular-nums` right-aligned + status badge below
- Divider: `border-b border-[#F0F0F5]`
- No checkboxes, no "..." menu
- Tap opens `handleViewInvoice`
- Desktop: keep existing table unchanged

**Status Badges**: Use design-system badge variants:
- draft: `bg-muted text-muted-foreground`
- pending: `variant="warning"`
- paid: `variant="success"`
- overdue: `variant="destructive"`

### 2. Import `useIsMobile`

Add responsive branching using the existing `useIsMobile` hook.

### Files

| Action | File |
|--------|------|
| Edit | `src/pages/Invoices.tsx` — mobile list, header, metrics, filters, alert banner |

No new files. No database changes. Desktop layout unchanged.

