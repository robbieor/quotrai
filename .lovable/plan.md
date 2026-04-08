

# Revert to Free Eircode Lookup (Local Table + Nominatim)

## What We're Doing
Replace the Loqate integration (which is out of credit) with the previously-built free solution: hardcoded routing key coordinates + Nominatim street-level refinement. Zero cost, unlimited lookups.

## Why This Works for Launch
- The 139 routing key coordinates place the geofence center in the correct area (~500m accuracy)
- Clock-in/out validation uses the **employee's phone GPS** vs the geofence center — so area-level is sufficient
- Nominatim fills in line1/line2 address details for display
- No API key needed, no monthly cost

## Changes

### 1. Rewrite `supabase/functions/eircode-lookup/index.ts`
- Remove all Loqate code (Find/Retrieve endpoints, API key reference)
- Restore the 139-entry `EIRCODE_ROUTING_KEYS` table with precise lat/lng
- Restore Nominatim-based lookup with Haversine proximity validation
- Restore reverse geocode fallback for street-level line1/line2 population
- Keep autocomplete mode using Nominatim search (free, works for Irish addresses)
- Keep the existing response schema so no client changes needed

### 2. Update `src/hooks/useAddressAutocomplete.ts`
- Revert autocomplete search to use Nominatim directly (faster than edge function round-trip for typing)
- Keep postcode lookups routing through the edge function
- Remove any Loqate-specific retrieve logic

### 3. Update `src/components/ui/address-autocomplete.tsx`
- Remove Loqate-specific two-step retrieve flow if present
- Ensure address selection works with Nominatim response format

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/eircode-lookup/index.ts` | Replace Loqate with local routing key table + Nominatim |
| `src/hooks/useAddressAutocomplete.ts` | Revert to Nominatim-based autocomplete |
| `src/components/ui/address-autocomplete.tsx` | Remove Loqate retrieve flow |

