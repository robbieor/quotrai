

# Foreman Investor Pitch Deck — Premium PPTX

## Approach
Generate a 12-slide PPTX using pptxgenjs with a restrained, premium design system inspired by Stripe/Linear investor materials. One message per slide, large typography, minimal text, Foreman brand green as the sole accent.

## Design System
- **Background**: Off-white `#F7F7F5` (warm, not clinical)
- **Primary text**: `#1A1A1A` (near-black)
- **Secondary text**: `#6B6B6B`
- **Accent**: `#0D9B6A` (Foreman green) — used sparingly for stats, key numbers, thin accent lines
- **Header font**: Arial Black / bold, 36-44pt
- **Body font**: Arial, 14-16pt
- **Layout**: Generous whitespace, left-aligned content, no clutter
- **No accent lines under titles** — whitespace only

## Slide Structure (12 slides)

### 1. Title
- "Foreman" large wordmark (48pt, green)
- "The AI Operating System for Field Service" (24pt, dark)
- "Pre-Seed — April 2026 | Confidential" (12pt, muted)
- Clean, centered, no imagery

### 2. Problem
- Headline: "The trades industry runs on paper."
- 3 large stat callouts in a row:
  - **65%** still pen & paper
  - **8 hrs/wk** lost to admin
  - **42%** invoices paid late
- One-line closer: "11M+ trade SMBs globally. The last major vertical to digitise."

### 3. Solution
- Headline: "One platform. Zero admin."
- 4 icon+label pairs (no descriptions, just the label):
  - Jobs & Scheduling
  - Quotes & Invoices
  - Payments & Chasers
  - AI Command Layer
- One-liner: "Foreman replaces 5+ tools with a single AI-powered OS."

### 4. Product (Visual)
- Headline: "Built, shipped, live."
- 2×3 grid of feature pills with green dot indicators:
  - Quoting · Invoicing · Calendar · GPS Tracking · Expenses · Customer Portal
- Subtext: "12 core features in production. Multi-currency. Mobile-first."

### 5. Foreman AI — The Differentiator
- Headline: "AI that acts. Not just answers."
- Left column: 3 example commands in quote-style blocks:
  - "What needs attention today?"
  - "Create an invoice for the kitchen job"
  - "Plan my week"
- Right column: What it does — Schedules, invoices, chases payments, handles calls
- Bottom label: "Voice + Chat + Photo-to-Quote — hands-free from the van"

### 6. Market
- Headline: "€18B market. 65% undigitised."
- 3 large boxes: TAM €18B / SAM €5.4B / SOM €900M
- One line: "Field service software growing 18% CAGR. AI adoption 28% CAGR."

### 7. Why Now
- Headline: "Six converging tailwinds."
- 3×2 grid, label only (no long descriptions):
  - AI cost collapse (90% cheaper)
  - Millennial trade owners
  - Late payment crisis
  - Post-COVID digital shift
  - Labour shortage
  - Embedded finance

### 8. Business Model
- Headline: "Three revenue streams."
- 3 large cards:
  - **Seats**: €19–€69/seat/mo (3 tiers)
  - **Platform fee**: 2.5% on every payment
  - **Target margin**: 80%+
- Bottom: "Revenue grows as customers grow — success-aligned."

### 9. Traction & Go-to-Market
- Headline: "Path to first 100 customers."
- Left: What's done (12 features, 20 trade landing pages, pricing validated)
- Right: GTM plan (Trade Facebook groups, video-led acquisition, SEO)

### 10. Competitive Landscape
- Headline: "Incumbents don't have AI."
- Simple comparison table (5 cols): Feature / Jobber / Tradify / ServiceTitan / **Foreman**
- Rows: AI Assistant, Photo Quoting, Payment Chasers, Platform Fee, Price
- Foreman column all green checkmarks

### 11. The Ask
- Headline: "€500K–€1M Pre-Seed"
- 4 key numbers: Raising / Valuation / Runway / Round type
- Use of funds horizontal bar (40% Product, 25% Sales, 20% CS, 15% Ops)
- Key milestones (4 bullet points)

### 12. Vision / Close
- Headline: "The future of field service is autonomous."
- Subtext: "Foreman doesn't just track work. It runs the business."
- "tom@foreman.ie" contact
- Foreman wordmark in green, centered

## Technical Execution
1. Copy pptxgenjs reference, write Node.js script to `/tmp/generate_deck.js`
2. Generate PPTX to `/mnt/documents/Foreman_Investor_Deck.pptx`
3. Convert to PDF → images for QA
4. Inspect every slide, fix issues, re-render

## Files
| Action | Path |
|--------|------|
| Create (temp) | `/tmp/generate_deck.js` |
| Create (output) | `/mnt/documents/Foreman_Investor_Deck.pptx` |

