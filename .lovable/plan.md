

## Fix: Quote creation fails — display_number has no default

### Problem
The `display_number` column (renamed from `quote_number`) is NOT NULL but has no DEFAULT value. The code in `useCreateQuote` correctly omits it expecting the DB to auto-generate it, but the migration only set defaults for `ref`, not `display_number`.

### Solution
**Database migration** — Add a default for `display_number` on both `quotes` and `invoices` tables that mirrors the `ref` default:

```sql
ALTER TABLE public.quotes 
  ALTER COLUMN display_number SET DEFAULT 'QR-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.quotes_ref_seq')::text, 5, '0');

ALTER TABLE public.invoices 
  ALTER COLUMN display_number SET DEFAULT 'IR-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.invoices_ref_seq')::text, 5, '0');
```

This means new quotes/invoices will auto-populate `display_number` with the same format as `ref`. Users can still override it manually.

### Files
- 1 new database migration (SQL only, no code changes needed)

