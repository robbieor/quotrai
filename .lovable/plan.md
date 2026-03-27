

## Positioning Sharpening — "AI Operating System" vs "AI Assistant"

CoreNav is an AI assistant that answers technical questions. Foreman is an AI operating system that runs the business. The copy needs to make this distinction unmistakable.

### The Differentiation

```text
CoreNav:  "Stuck on the job? Ask CoreNav." → Answers questions
Foreman:  "Your business runs itself."     → Runs operations
```

CoreNav helps a tech diagnose a cracked heat exchanger. Foreman creates the quote, schedules the job, invoices the client, chases the payment, and tells you your profit margin — without being asked.

### Changes

**1. Brand tagline update** (`src/config/brand.ts`)
- Current: "Job Management & AI for Trade Businesses"
- New: "The AI Operating System for Field Service"

**2. Page title & meta** (`index.html`)
- Title: "Foreman — The AI Operating System for Field Service"
- Description: Emphasize "runs your operations" not "manages jobs"
- JSON-LD description updated

**3. Hero copy sharpening** (`src/components/landing/HeroSection.tsx`)
- Current subtitle: "Run quotes, jobs, invoices, and payments — using voice or text."
- New subtitle: "Foreman runs your quotes, jobs, invoices, and payments — so you don't have to."
- Current tagline: "Built for field service pros — not accountants."
- New tagline: "Not another app. An operating system for your trade business."
- Update bullets from feature-list to outcome-list:
  - "Quotes created and sent — without lifting a finger"
  - "Overdue invoices chased automatically"
  - "Your next best action — surfaced every morning"

**4. Problem section sharpening** (`src/components/landing/ProblemSection.tsx`)
- Add a fourth pain point: "Using 'AI tools' that answer questions but don't do the work"

**5. Foreman AI section** (`src/components/landing/ForemanAISection.tsx`)
- Current heading: "Just tell it what you need."
- New heading: "It already knows what you need."
- Shift bullets from capabilities to autonomy:
  - "Detects risks before you notice them"
  - "Chases payments without being told"
  - "Briefs you every morning on what matters"
  - "Voice or text — your choice"

**6. SEO meta** (`src/components/shared/SEOHead.tsx`)
- Update default description to match the OS positioning

### Files Modified

| File | Change |
|------|--------|
| `src/config/brand.ts` | Tagline → "The AI Operating System for Field Service" |
| `index.html` | Title, meta description, OG tags, JSON-LD |
| `src/components/landing/HeroSection.tsx` | Hero copy, bullets, tagline |
| `src/components/landing/ProblemSection.tsx` | Add 4th pain point |
| `src/components/landing/ForemanAISection.tsx` | Heading + bullets rewrite |
| `src/components/shared/SEOHead.tsx` | Default description update |

### No database changes. No structural changes. Copy and positioning only.

