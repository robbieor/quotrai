
# Switch to Google Geocoding API + Remove Autoaddress

## Why
- Autoaddress.ie costs €83/month — not viable pre-revenue
- Google Geocoding API is free under 28,000 requests/month
- Returns structured addresses + GPS coordinates (lat/lng) for clock-in/out geofencing

## Changes

### 1. Update `eircode-lookup` edge function
- Replace Autoaddress.ie calls with Google Geocoding API
- Autocomplete mode → Google Places Autocomplete API
- Lookup mode → Google Geocoding API (address/Eircode → structured address + lat/lng)
- Keep the same request/response interface so the frontend doesn't need changes
- Fallback to Nominatim if Google fails

### 2. Swap API key
- Remove `AUTOADDRESS_API_KEY` secret
- Add `GOOGLE_MAPS_API_KEY` secret (user gets from Google Cloud Console, enable Geocoding + Places APIs)

### 3. No frontend changes needed
- The edge function returns the same JSON shape
- `useAddressAutocomplete` hook and `CustomerFormDialog` work unchanged

## What the user needs
- A Google Cloud project with Geocoding API + Places API enabled
- An API key (restricted to server-side use) — free tier covers 28k geocode + 28k autocomplete requests/month
