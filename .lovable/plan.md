

## Fix Quotes Page — Ambiguous Relationship Error

### Problem
The quotes query fails with HTTP 300 because there are two foreign key relationships between `quotes` and `jobs`:
1. `quotes.job_id → jobs.id` (many-to-one, quote linked to a job)
2. `jobs.quote_id → quotes.id` (one-to-many, job created from a quote)

PostgREST can't pick which one to use, so the main query silently fails and returns no data. The stats query (which doesn't join `jobs`) works fine and returns 1,209 quotes.

### Fix
Disambiguate the join by specifying the FK name in the select string. Change `job:jobs(id, title)` to `job:jobs!quotes_job_id_fkey(id, title)` in `useQuotes.ts`.

### Files Changed

| File | Change |
|------|--------|
| `src/hooks/useQuotes.ts` | Add `!quotes_job_id_fkey` hint to both `useQuotes()` and `useQuote()` select strings |

### Specific Change
```typescript
// Before
job:jobs(id, title),

// After
job:jobs!quotes_job_id_fkey(id, title),
```

Applied in two places: the list query (line ~23) and the single-quote query (line ~41).

