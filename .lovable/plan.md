

## 5 Big-Ticket Features — Implementation Plan

### Feature 1: AI Photo-to-Quote Evolution

**Current state**: Single photo upload → single AI analysis → basic line items. No multi-photo, no material detection labels, no price book lookup.

**Upgrades**:

| Change | File | Detail |
|--------|------|--------|
| Multi-photo upload (up to 5) | `PhotoQuoteButton.tsx` | Change `fileInputRef` to accept `multiple`, collect array of files, show thumbnail strip |
| Batch image analysis | `george-photo-quote/index.ts` | Accept `image_urls: string[]`, send all images in one AI prompt with instruction to cross-reference across photos |
| Material identification badges | `PhotoQuoteCard.tsx` | Already has `is_material` flag — add detected material name field (e.g. "15mm copper pipe") from AI response |
| Annotated preview | `PhotoQuoteCard.tsx` | Show uploaded photos in a mini gallery above line items with tap-to-zoom |
| Price book lookup | `george-photo-quote/index.ts` | After AI generates line items, cross-reference against `supplier_price_book` table (new) to fill unit prices from saved supplier rates instead of AI guesses |

**New DB table**: `supplier_price_book` (ties into Feature 6 below)

---

### Feature 3: Client Self-Service Portal Upgrade

**Current state**: `QuotePortal` has Accept/Decline buttons. `InvoicePortal` has Pay Now via Stripe. No e-signature, no progress photos, no follow-up request form.

**Upgrades**:

| Change | File | Detail |
|--------|------|--------|
| E-signature on quote acceptance | `QuotePortal.tsx` | Add a canvas-based signature pad (react-signature-canvas) shown in the Accept dialog. Save signature image to storage, record `signed_at` + `signature_url` on quote |
| Progress photos gallery | `QuotePortal.tsx`, `InvoicePortal.tsx` | New section showing job photos (from `job_photos` table) grouped by date, visible to customer |
| Follow-up work request | `QuotePortal.tsx` | After quote is accepted, show a "Request Additional Work" form that creates a new lead/enquiry linked to the customer |
| Company branding on portal | Both portals | Replace hardcoded "T" avatar with team logo from `team_branding` table, show company colors |

**New DB tables**: `job_photos` (job_id, photo_url, caption, uploaded_at, uploaded_by), add `signature_url` + `signed_at` columns to quotes

**New edge function**: None — portal hooks already exist, just extend `usePortal`

---

### Feature 4: Smart Scheduling

**Current state**: Calendar has drag-and-drop rescheduling. No travel time, no route awareness, no address-based optimization.

**Upgrades**:

| Change | File | Detail |
|--------|------|--------|
| Travel time estimates between jobs | `DayView.tsx`, `WeekView.tsx` | Show estimated travel time between consecutive jobs using straight-line distance calculation (Haversine) from job site addresses |
| Route optimization suggestion | New: `src/components/calendar/RouteOptimizer.tsx` | "Optimize Day" button that reorders jobs to minimize total travel. Uses a nearest-neighbour algorithm on job site coordinates |
| Job site coordinates | `JobFormDialog.tsx` | When address is entered, geocode it (using existing address autocomplete) and store lat/lng on the job |
| Visual travel indicators | `DayView.tsx` | Between job cards, show a small "🚗 ~15 min" chip with estimated drive time |

**DB change**: Add `latitude`, `longitude` columns to `jobs` table (nullable, populated from address autocomplete)

**No external API needed** for MVP — use Haversine formula for distance, assume 30mph average speed for time estimate. Can upgrade to Google Directions API later.

---

### Feature 6: Supplier Price Book

**Current state**: No supplier/material pricing system. Quote line item prices are manually entered or AI-guessed.

**Implementation**:

| Change | File | Detail |
|--------|------|--------|
| New page: Supplier Price Book | `src/pages/PriceBook.tsx` | Searchable table of materials with supplier, unit price, last updated date |
| CSV import | `supabase/functions/import-price-book/index.ts` | Parse CSV with columns: item_name, supplier, unit, unit_price, category |
| Price lookup in quote creation | `QuoteLineItems.tsx` | Autocomplete on description field that searches price book, auto-fills unit price |
| Margin indicator | `QuoteLineItems.tsx` | If price book match found, show margin % badge (sell price vs cost price) |
| Photo-quote integration | `george-photo-quote/index.ts` | After AI identifies materials, look up price book for accurate pricing |

**New DB table**:
```sql
supplier_price_book (
  id uuid PK,
  team_id uuid FK,
  item_name text,
  supplier_name text,
  category text,
  unit text, -- "each", "metre", "box"
  cost_price numeric,
  sell_price numeric,
  last_updated timestamptz
)
```

**Route**: Add `/price-book` to `App.tsx`, add sidebar nav item under "Documents" or as its own section

---

### Feature 7: End-of-Day AI Summary

**Implementation**:

| Change | File | Detail |
|--------|------|--------|
| Summary edge function | `supabase/functions/end-of-day-summary/index.ts` | Queries today's completed jobs, hours logged (time_entries), invoices sent, payments received, tomorrow's scheduled jobs. Formats into a concise summary via AI |
| Push notification | Same function | Sends summary as email + creates a notification record in `notifications` table |
| In-app summary card | `src/components/dashboard/EndOfDaySummary.tsx` | If current time is after 5pm, show today's summary card at top of dashboard |
| Cron trigger | DB cron or manual trigger | Schedule for 5pm in user's timezone (store timezone preference on profile) |
| Foreman AI integration | `george-chat/index.ts` | Add "end_of_day_summary" to quick-action short-circuit map so users can ask "How did today go?" |

**DB changes**: Add `timezone` column to `profiles` table (default 'Europe/Dublin')

---

### Implementation Order (by dependency)

1. **Supplier Price Book** (Feature 6) — standalone, no dependencies, enables Feature 1
2. **Photo-to-Quote Evolution** (Feature 1) — depends on price book for pricing lookup
3. **Client Portal Upgrade** (Feature 3) — standalone, high customer-facing impact
4. **Smart Scheduling** (Feature 4) — needs lat/lng on jobs, standalone otherwise
5. **End-of-Day Summary** (Feature 7) — standalone, ties dashboard + AI together

### Total New Files
- `src/pages/PriceBook.tsx`
- `supabase/functions/import-price-book/index.ts`
- `src/components/calendar/RouteOptimizer.tsx`
- `supabase/functions/end-of-day-summary/index.ts`
- `src/components/dashboard/EndOfDaySummary.tsx`

### Total Modified Files
- `PhotoQuoteButton.tsx`, `PhotoQuoteCard.tsx`, `george-photo-quote/index.ts`
- `QuotePortal.tsx`, `InvoicePortal.tsx`, `usePortal.ts`
- `QuoteLineItems.tsx`
- `DayView.tsx`, `WeekView.tsx`, `JobFormDialog.tsx`
- `George.tsx`, `george-chat/index.ts`
- `App.tsx` (new route), `AppSidebar.tsx` (new nav item)
- 4 DB migrations

