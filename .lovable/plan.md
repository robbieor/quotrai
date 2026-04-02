

# Investor Deck — Interactive Story-Driven Redesign

## Problem
All 6 investor pages are static walls of cards and tables. No visual hierarchy, no narrative flow, no scroll-driven storytelling. They look like admin dashboards, not a pitch experience. An investor scanning these pages gets no emotional impact.

## Design Direction
Transform each page into a scroll-driven story with full-bleed hero sections, animated counters, cinematic backgrounds, and progressive reveal. Think Apple product pages meets Linear's investor materials. The investor should feel the problem, see the solution, and believe in the opportunity — all through scrolling.

## Shared Components (New)

### `InvestorSection` — Full-width story block
Each "section" is a full-viewport-height (or min-height) block with its own background treatment. Replaces flat Card grids with immersive sections that alternate between dark navy hero blocks and light content blocks.

### `AnimatedCounter` — Number reveal
Large stats (€18B, 65%, 11M+) animate up from 0 when they scroll into view using `IntersectionObserver`. Creates the "jaw drop" moment.

### `FadeInOnScroll` — Progressive reveal wrapper
Children fade + slide up when entering viewport. Staggered delays for grid items.

### Updated `InvestorLayout`
- Remove the generic header subtitle area
- Add smooth scroll behavior
- Dark/light alternating section support
- Progress indicator (thin green bar at top showing scroll %)

## Page-by-Page Redesign

### 1. Pitch (`/investor/pitch`) — "The Story"
**Structure**: Problem → Pain → Solution → Traction → Ask

- **Hero**: Full dark navy section. "The Operating System for Trade Businesses" in massive 56px white text. Single green accent line. Scroll arrow.
- **Problem section**: Dark red/navy gradient. 4 animated counters (65%, 8hrs, 42%, 11M+) that count up on scroll. Below: one punchy paragraph.
- **Solution section**: Light background. 4 pillars as large icon+title blocks that fade in staggered. No descriptions until hover/click expands.
- **Business Model**: 3 large number cards side by side (€19-69/seat, 2.5% fee, 80%+ margin) with subtle green left borders.
- **The Ask**: Dark section. €500K–€1M in massive green text. Use of funds as animated horizontal bars. Milestones as a timeline.

### 2. Market (`/investor/market`) — "The Opportunity"
- **Hero**: "€18B" in enormous text (80px+) with animated counter. "The last major vertical to digitise" subtitle.
- **TAM/SAM/SOM**: Concentric circles or nested boxes visualization, not flat cards.
- **Why Now**: 6 tailwinds as a 2×3 grid with icons that pulse/glow on scroll-in.
- **Competitors**: Visual comparison matrix with green checkmarks for Foreman advantages.
- **Geographic expansion**: Map-style visual showing launch markets.

### 3. Product (`/investor/product`) — "See It In Action"
- **Hero**: "Built. Shipped. Live." with animated feature count.
- **Feature showcase**: Instead of 20 cards, show 5 key workflows as horizontal scroll cards with large icons and one-line descriptions. Click expands detail.
- **AI section**: Dark navy background. Show 3 voice commands in a mock chat interface that types out letter by letter.
- **Tech stack**: Minimal pill badges, not a table.
- **Roadmap**: Horizontal timeline with quarter markers.

### 4. Team (`/investor/team`) — "Who's Building This"
- **Founder spotlight**: Large section with photo placeholder, key stats (features built, zero outsourcing, solo-built).
- **Why this team**: Cards with hover reveal for details.
- **Hiring plan**: Visual timeline (vertical) with role + timing.
- **Values**: 3 large quote-style blocks.

### 5. Projections & Forecast — Keep existing interactive sliders but wrap in the new section treatment with better backgrounds and typography.

## Technical Implementation

### New files:
| File | Purpose |
|------|---------|
| `src/components/investor/InvestorSection.tsx` | Full-bleed section with dark/light variants |
| `src/components/investor/AnimatedCounter.tsx` | Scroll-triggered number animation |
| `src/components/investor/FadeInOnScroll.tsx` | IntersectionObserver fade-in wrapper |
| `src/components/investor/ScrollProgress.tsx` | Thin green progress bar at top |

### Edited files:
| File | Change |
|------|--------|
| `src/components/investor/InvestorLayout.tsx` | Add scroll progress bar, remove flat subtitle, add dark mode section support |
| `src/pages/InvestorPitch.tsx` | Full rewrite — story-driven sections |
| `src/pages/InvestorMarket.tsx` | Full rewrite — hero counter, visual TAM, competitor matrix |
| `src/pages/InvestorProduct.tsx` | Full rewrite — workflow showcase, typing AI demo |
| `src/pages/InvestorTeam.tsx` | Full rewrite — cinematic founder section, timeline hiring |

### Animation approach:
- `IntersectionObserver` with `threshold: 0.2` for scroll triggers
- CSS transitions (transform + opacity) — no heavy animation libraries
- Counters use `requestAnimationFrame` for smooth 60fps counting
- Staggered delays via `transitionDelay` on grid children

### Color system for investor pages:
- Dark sections: `bg-[#0f172a]` (sidebar navy) with white text
- Light sections: `bg-background` (warm off-white)
- Accent: `text-primary` (Foreman green) for key stats and CTAs
- Alternating pattern creates visual rhythm and prevents flatness

