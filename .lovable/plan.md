

# Update Autoaddress API Key + Verify Integration

## What happens

1. **Update the `AUTOADDRESS_API_KEY` secret** with the new valid key you provide
2. **Test the `eircode-lookup` edge function** with a real Eircode (e.g. D02 AF30) to confirm the API responds with address + GPS coordinates
3. **Verify end-to-end** — confirm the customer form auto-populates and lat/lng are returned for geofencing

## No code changes needed

The edge function and UI components are already built and working — they just need a valid API key. Once updated, the existing flow will activate:
- Client form: type Eircode → address auto-populates
- Clock-in: GPS verified against Eircode coordinates

## Steps

1. Use `update_secret` to replace `AUTOADDRESS_API_KEY` with your new key
2. Call `eircode-lookup` edge function with a test Eircode to verify 200 response
3. Confirm address fields + lat/lng are returned correctly

