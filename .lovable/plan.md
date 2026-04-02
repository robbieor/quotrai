

# Foreman Premium Theme Overhaul — "Dark Navy Command Center"

## Problem
The current light theme is too flat and white. Background `#FAFAFA`, cards `#FFFFFF`, sidebar `#FFFFFF` — everything blends together. It feels like a prototype, not a billion-dollar operating system. The Foreman wordmark gets lost against the white.

## Design Direction
Inspired by Linear, Vercel Dashboard, and Bloomberg Terminal — a **dark sidebar + rich header** paired with a warm off-white content area. The Foreman green (`#0D9B6A`) becomes a confident accent, not just a button color.

```text
┌──────────────────────────────────────────┐
│ ██ DARK NAVY SIDEBAR  │  WARM CONTENT    │
│ ██ Foreman wordmark   │  Cards with      │
│ ██ in WHITE + GREEN   │  subtle green    │
│ ██ Active nav: green  │  gradient hints  │
│ ██ bg accent          │                  │
│ ██                    │  KPI cards with  │
│ ██                    │  left-border     │
│ ██                    │  color accents   │
│ ██ ─── ─── ─── ─── ──│──────────────────│
│ ██ Footer: dark       │  HEADER: dark    │
│ ██                    │  navy strip      │
└──────────────────────────────────────────┘
```

## Changes

### 1. CSS Variables — Richer Palette (`src/index.css`)
- **Sidebar**: Dark navy (`220 26% 12%`) background with white text — the Foreman wordmark pops immediately
- **Header**: Match sidebar dark tone so the top bar feels authoritative
- **Background**: Slightly warmer off-white (`220 14% 96%`) instead of pure `0 0% 98%`
- **Cards**: Keep white but add a very subtle warm tint (`220 20% 99%`)
- **Border**: Softer, slightly tinted (`220 13% 90%`)
- **Muted surfaces**: Warmer grey (`220 14% 94%`) for depth contrast
- Primary green stays exactly the same — it's the hero color

### 2. Sidebar — Dark Premium (`src/components/layout/AppSidebar.tsx`)
- Sidebar bg becomes dark navy via CSS vars (no hardcoded colors)
- Foreman wordmark text: `text-white` with larger weight — unmissable
- Nav items: `text-white/70` default, `text-white` on hover, active state gets a `bg-primary/20` pill with white text
- Remove the `border border-muted-foreground/50` on nav links (looks dated on dark bg) — use clean padding-based items
- Group labels: `text-white/40` uppercase
- Footer user section: white text on dark, avatar ring in primary green

### 3. Header Bar — Dark Command Strip (`src/components/layout/DashboardLayout.tsx`)
- Change from `bg-primary-foreground` (white) to dark navy matching sidebar
- Search bar: transparent with white/60 text and subtle border
- Icons (notification, user menu): white on dark
- This creates a seamless dark "frame" around the content area

### 4. KPI Cards — Accent Borders (`src/components/dashboard/KPIStrip.tsx`)
- Add a 3px left border in primary green to each KPI card
- On hover, the left border intensifies slightly

### 5. Morning Briefing — Richer Gradient (`src/components/dashboard/MorningBriefingCard.tsx`)
- Strengthen the gradient: `from-primary/10 via-primary/3 to-card`
- Add a subtle green left border accent (4px)

### 6. Control Header — Subtle Enhancement (`src/components/dashboard/ControlHeader.tsx`)
- Add a top green accent line (2px) to the status bar

### 7. Dark Mode — Already Exists, Verify Consistency
- The dark mode variables are already defined — they'll benefit from the sidebar/header being dark in light mode too (feels cohesive)

## Files Changed

| Action | File | Change |
|--------|------|--------|
| Edit | `src/index.css` | Update sidebar vars to dark navy, warm up background/card/border, header vars |
| Edit | `src/components/layout/AppSidebar.tsx` | White text on dark sidebar, remove bordered nav style, green active state |
| Edit | `src/components/layout/DashboardLayout.tsx` | Dark header strip, white icons/text |
| Edit | `src/components/dashboard/KPIStrip.tsx` | Add green left-border accent to cards |
| Edit | `src/components/dashboard/MorningBriefingCard.tsx` | Richer green gradient + left border |
| Edit | `src/components/dashboard/ControlHeader.tsx` | Top green accent line |

## Foreman Wordmark Visibility
The dark sidebar guarantees the white "Foreman" text is always highly visible — the most prominent element in the sidebar. No risk of getting lost.

