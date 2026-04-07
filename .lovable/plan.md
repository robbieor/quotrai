

# Fix: Eircode Lookup 404 Error + Audit Cleanup

## Problems Found

1. **The 404 error** — When user types an Eircode, `handleInputChange` fires BOTH `lookupPostcode()` (edge function with `mode: "lookup"` — works) AND `searchAddress()` (direct Nominatim — fails for Eircodes). The failing Nominatim call generates the 404 error in console.

2. **UK postcode bypass** — The client-side `lookupUKPostcode` hook skips the edge function entirely and calls Nominatim directly, missing the `postcodes.io` integration that gives better results.

3. **Redundant direct Nominatim calls** — `searchAddress` in the hook calls Nominatim directly from the browser. When the input is a detected postcode, this is wasteful and produces bad results.

## Fix

### 1. Skip autocomplete search when postcode detected (`address-autocomplete.tsx`)

In `handleInputChange`, when `isLikelyCompletePostcode` is true, do NOT call `searchAddress()`. The postcode lookup handles it.

```
if (isLikelyCompletePostcode) {
  lookupPostcode(newValue).then(...)
} else {
  searchAddress(newValue, countryCode);
  setIsOpen(true);
}
```

### 2. Route UK postcode through edge function (`useAddressAutocomplete.ts`)

Change `lookupUKPostcode` to call the edge function with `mode: "lookup"` (same pattern as `lookupEircode`), so it uses the `postcodes.io` integration server-side.

### 3. Route US ZIP through edge function too (`useAddressAutocomplete.ts`)

Same pattern — call the edge function for consistency. The edge function's generic Nominatim fallback handles US ZIPs fine.

## Files Changed

| File | Change |
|------|--------|
| `src/components/ui/address-autocomplete.tsx` | Skip `searchAddress` when postcode is detected |
| `src/hooks/useAddressAutocomplete.ts` | Route UK + US lookups through edge function instead of direct Nominatim |

