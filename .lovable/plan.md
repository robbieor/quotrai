

# Fix: Address Line 1 Empty on Eircode Lookup

## Problem
Google Geocoding returns Eircodes as area-level results (e.g. "Saint James") without `street_number` or `route` components. The current code only builds `line1` from those two fields, so it returns empty.

## Root Cause
Line 132: `const line1 = streetNumber && route ? ... : route || sublocality || "";`
Google returns "Saint James" as a `neighborhood` component, not `sublocality`. So all fallbacks miss it.

## Fix (single file change)

### `supabase/functions/eircode-lookup/index.ts`

1. **Expand `line1` fallback chain** to include `neighborhood`, `premise`, `point_of_interest`, and finally extract the first segment of `formatted_address` as last resort:

```typescript
const neighborhood = getComponent("neighborhood");
const premise = getComponent("premise");

const line1 = streetNumber && route 
  ? `${streetNumber} ${route}` 
  : route 
  || sublocality 
  || neighborhood 
  || premise
  || (result.formatted_address?.split(",")[0]?.trim() || "");
```

2. **Also populate `line2`** more intelligently — if line1 came from route and there's a neighborhood/sublocality, use that:

```typescript
const line2 = (line1 === route && (sublocality || neighborhood)) 
  ? (sublocality || neighborhood) 
  : (sublocality && route ? sublocality : "");
```

This ensures "D08 NRH1" → line1: "Saint James", with all other fields already populating correctly.

## Files Changed
- `supabase/functions/eircode-lookup/index.ts` — expand line1/line2 fallback logic (~3 lines changed)

## Verification
- Redeploy edge function
- Test with "D08 NRH1" — expect line1: "Saint James"
- Test with a full street address — expect line1: "123 Main Street" as before

