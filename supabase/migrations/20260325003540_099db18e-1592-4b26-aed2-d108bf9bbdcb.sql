
ALTER TABLE public.job_sites
  ADD COLUMN IF NOT EXISTS location_confidence text NOT NULL DEFAULT 'high',
  ADD COLUMN IF NOT EXISTS location_valid_for_gps boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS geocode_source text DEFAULT 'address';

COMMENT ON COLUMN public.job_sites.location_confidence IS 'high (eircode/exact), medium (street-level), low (area-level), none (PO Box/failed)';
COMMENT ON COLUMN public.job_sites.location_valid_for_gps IS 'false if PO Box or geocoding failed - prevents GPS geofence checks';
COMMENT ON COLUMN public.job_sites.geocode_source IS 'address, eircode, postcode, manual_pin, customer_inherited';
