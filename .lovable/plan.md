
# Eircode Integration via Autoaddress.ie API

## Why Autoaddress.ie
- Most popular Irish address API (An Post, Revenue, ESB all use it)
- Returns full structured address + GPS coordinates from Eircode
- Has autocomplete (type-ahead) for partial address entry
- Free tier available (500 lookups/month), paid plans scale well
- REST API, no SDK needed — simple edge function proxy

## What this enables

### 1. Client Address Entry (Customers page)
- Add Eircode input field to customer address form
- Type an Eircode → auto-populate: address line 1, line 2, city, county, country, lat/lng
- Also support autocomplete: start typing an address → suggestions appear → select → fills all fields
- Coordinates stored on customer record for job site geofencing

### 2. Workforce Clock-In/Out Verification
- When a worker clocks in, compare their live GPS against the Eircode's known coordinates
- Auto-fill the job site address from Eircode if entered manually
- Validate proximity: GPS must be within geofence radius of Eircode location
- Show verification status: "Eircode verified — 15m from site" or "Location mismatch"

## Implementation

### Step 1: Store Autoaddress API key
- Use `add_secret` tool for `AUTOADDRESS_API_KEY`
- User gets key from https://account.autoaddress.ie

### Step 2: Edge function `eircode-lookup`
- `POST /eircode-lookup` with `{ query: "D02XY12" }` or `{ query: "12 Main St" }`
- Proxies to Autoaddress.ie API (autocomplete + getEcad endpoints)
- Returns: structured address, Eircode, lat/lng, confidence level
- Validates input, handles errors

### Step 3: Reusable `<EircodeAddressInput>` component
- Combined input: user types Eircode OR address text
- Shows autocomplete suggestions dropdown
- On selection: fills parent form fields (line1, line2, city, region, postcode, lat, lng)
- Works in: Customer form, Job site form, any address entry

### Step 4: Wire into Customer form
- Replace current manual address fields with `<EircodeAddressInput>` + manual override
- Auto-populate lat/lng for geofencing

### Step 5: Wire into Clock-In verification
- When clock-in happens, if job site has Eircode-derived coordinates, validate GPS proximity
- Show enhanced verification badge: "Eircode Verified" vs existing "GPS Verified"

## Files
- `supabase/functions/eircode-lookup/index.ts` — NEW edge function
- `src/components/shared/EircodeAddressInput.tsx` — NEW reusable component
- `src/components/customers/CustomerForm.tsx` — wire in Eircode input
- `src/components/time-tracking/` — enhance GPS verification with Eircode data

## No database changes needed
- Customer table already has lat/lng, address fields
- Job sites table already has coordinates
