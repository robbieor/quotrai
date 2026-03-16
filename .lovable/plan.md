

# Quotr Time Tracking & GPS System -- Technical Audit and Redesign Plan

## Current Architecture Assessment

### Critical Failures Identified

**1. No offline support whatsoever.**
Every clock-in, clock-out, and location ping calls `supabase.from(...).insert()` directly. If the technician has no signal (common on construction sites, rural Ireland), the operation silently fails. There is no local queue, no retry, no IndexedDB fallback. The `syncLocationToServer` method in `geolocation.ts` catches errors and logs them -- then drops the data permanently.

**2. Background tracking is unreliable.**
The "background" strategy is a `setInterval` every 30 seconds calling `getCurrentPosition()`. On iOS, this interval will be suspended within seconds of backgrounding. On Android, Doze mode will kill it. The Capacitor `@capacitor/geolocation` `watchPosition` also stops in background on both platforms. There is no use of `@capacitor/background-runner`, `@transistorsoft/capacitor-background-geolocation`, or any actual background-capable plugin.

**3. Clock-in uses stale location.**
In `ClockInOutCard.tsx`, `handleClockIn` calls `fetchLocation()` (which sets state), then immediately reads `currentLocation` from the *previous* render's state -- not the freshly fetched position. This is a classic React stale-closure bug. The geofence verification at clock-in may use a position that is minutes or hours old.

**4. Geofence monitoring is purely client-side polling.**
`useGeofenceMonitoring` compares the latest `currentLocation` against all job sites on every location update. This only works while the app is in the foreground with active tracking. There is no server-side geofence validation, no OS-level geofence registration, and no fallback.

**5. Staff map is a placeholder.**
`StaffLocationMap` renders staff at random positions with `Math.random()`. It does not use actual GPS coordinates, Leaflet, or any real map library despite Leaflet being in the tech spec.

**6. `useStaffLocations` fetches ALL location pings ever recorded.**
It queries `location_pings` with no time filter, then deduplicates client-side. This will degrade to unusable performance as data grows.

**7. No travel time or mileage integration.**
Clock-in/out is isolated from the mileage tracking system. There is no journey-to-job linkage.

**8. No duplicate clock-in prevention.**
A user can clock into multiple jobs simultaneously -- there is no server-side constraint.

---

## Competitor Benchmark

| Capability | Tradify | Fergus | SimPRO | ServiceM8 | Quotr (current) | Quotr (proposed) |
|---|---|---|---|---|---|---|
| GPS clock-in | Yes | Yes | Yes | Yes | Buggy | Reliable |
| Background tracking | Limited | No | Yes | Yes | Broken | Full |
| Offline clock-in | No | No | Yes | Yes | No | Yes |
| Auto clock-in/out | No | No | No | No | No | Yes |
| Real-time staff map | No | No | Yes | Yes | Placeholder | Leaflet live map |
| Travel time tracking | No | No | Limited | No | No | Auto-detected |
| Time theft detection | No | No | No | No | No | Yes |
| Site visit photos | No | No | Yes | Yes | No | Yes |

---

## Redesign Architecture

```text
+------------------+       +-------------------+       +------------------+
|   Mobile App     |       |  Offline Queue    |       |   Supabase DB    |
|  (Capacitor)     |------>|  (IndexedDB)      |------>|                  |
|                  |       |  - clock events   |       |  time_entries    |
|  Background GPS  |       |  - location pings |       |  location_pings  |
|  (transistorsoft)|       |  - photos         |       |  geofence_events |
|                  |       +-------------------+       |  travel_logs     |
|  OS Geofences    |              |                    +------------------+
|  (native APIs)   |              | sync when online          |
+------------------+              +---->  Edge Function  <----+
                                        (event-ingestion)
                                              |
                                     +--------+--------+
                                     |                  |
                              Server-side         Anomaly
                              geofence            detection
                              validation          (time theft)
```

---

## Implementation Plan

### Phase 1: Fix Critical Bugs (Immediate)

**A. Fix stale location on clock-in** (`ClockInOutCard.tsx`)
- Make `handleClockIn` await the GPS position and pass coordinates directly to `clockIn.mutate()` instead of reading from stale React state.

**B. Fix unbounded location_pings query** (`useTimeTracking.ts`)
- Add `.gte('recorded_at', last24hours)` filter to `useStaffLocations`.

**C. Add server-side duplicate clock-in prevention**
- Database migration: add a partial unique index on `time_entries(user_id)` where `status = 'active'` to prevent multiple active entries.

### Phase 2: Offline-First Queue

**A. Create `src/lib/offlineQueue.ts`**
- IndexedDB-backed queue (using `idb-keyval` or raw IndexedDB) that stores pending operations: clock-in, clock-out, location pings.
- Each entry has: `id`, `type`, `payload`, `created_at`, `retry_count`.
- On network restore, flush queue to backend in order.

**B. Wrap all mutations**
- `useClockIn` and `useClockOut` try the network call; on failure, enqueue locally and show "Saved offline -- will sync when connected."
- Location pings batch locally and sync every 60s or on reconnect.

### Phase 3: Reliable Background Geolocation

**A. Replace `@capacitor/geolocation` background logic with `@transistorsoft/capacitor-background-geolocation`**
- This is the industry-standard plugin for Capacitor background tracking. It handles iOS/Android background modes, battery optimization, motion detection, and geofence registration natively.
- Configure with: `desiredAccuracy: HIGH`, `distanceFilter: 50m`, `stopOnTerminate: false`, `startOnBoot: true`.
- Register OS-level geofences for all active job sites so enter/exit events fire even when the app is killed.

**B. Update `src/lib/capacitor/geolocation.ts`**
- Refactor the singleton to use `@transistorsoft/capacitor-background-geolocation` on native, keep browser Geolocation API as web fallback.
- On geofence enter/exit, trigger local notification + queue clock-in/out prompt.

### Phase 4: Real Staff Map with Leaflet

**A. Replace placeholder map with Leaflet + OpenStreetMap**
- Use `react-leaflet` (already in the tech spec).
- Plot actual staff coordinates from `useStaffLocations`.
- Draw geofence circles around job sites.
- Add Realtime subscription to `location_pings` for live updates without polling.

### Phase 5: Server-Side Geofence Validation

**A. Create Edge Function `validate-clock-event`**
- On every clock-in/out, the edge function receives coordinates and job_site_id.
- It performs server-side Haversine distance check.
- It sets `clock_in_verified` / `clock_out_verified` authoritatively (client value is advisory only).
- Flags suspicious events (>500m from site, GPS accuracy >100m).

**B. Database trigger on `time_entries` insert/update**
- Automatically calls validation and writes to an `audit_log` table.

### Phase 6: Next-Generation Features

**A. Automatic clock-in/out**
- When OS geofence fires ENTER and user has an assigned job at that site, show persistent notification with "Clock In" action button. If user enables "auto" mode in settings, clock in automatically.
- On EXIT, prompt clock-out after 2-minute dwell-exit (prevents false triggers from GPS drift).

**B. Travel time detection**
- When a user transitions from "stationary at home/office" to "moving" to "stationary at job site", automatically create a `travel_log` entry with distance (from accumulated pings) and duration.
- Link to mileage tracking system that already exists.

**C. Time theft detection (Edge Function)**
- Flag: clocked in but no location pings for >15 minutes.
- Flag: location pings show user left geofence but didn't clock out.
- Flag: clock-in GPS accuracy >200m (spoofed location).
- Flag: clock-in from a different device than usual.
- Surface these as alerts in the owner dashboard.

**D. Site visit verification photos**
- On clock-in, optionally capture a photo via `@capacitor/camera`.
- Upload to storage bucket, link to time_entry.
- EXIF metadata provides independent location/time verification.

**E. Customer arrival notification**
- When technician enters job site geofence, send push notification to customer (if they have the portal app) or SMS via existing email infrastructure.

### Phase 7: Database Schema Changes

```sql
-- Prevent duplicate active clock-ins
CREATE UNIQUE INDEX idx_one_active_entry_per_user
  ON time_entries (user_id)
  WHERE status = 'active';

-- Travel logs
CREATE TABLE travel_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  time_entry_id UUID REFERENCES time_entries(id),
  origin_address TEXT,
  destination_address TEXT,
  distance_meters NUMERIC,
  duration_seconds INTEGER,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clock-in photos
ALTER TABLE time_entries
  ADD COLUMN clock_in_photo_url TEXT,
  ADD COLUMN clock_out_photo_url TEXT;

-- Anomaly flags
CREATE TABLE time_anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL,
  time_entry_id UUID REFERENCES time_entries(id),
  user_id UUID NOT NULL,
  anomaly_type TEXT NOT NULL, -- 'no_pings', 'left_geofence', 'low_accuracy', 'device_mismatch'
  details JSONB,
  reviewed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable realtime on location_pings for live map
ALTER PUBLICATION supabase_realtime ADD TABLE public.location_pings;
```

---

## Files to Change

| File | Change |
|---|---|
| `src/components/time-tracking/ClockInOutCard.tsx` | Fix stale location bug; add photo capture option |
| `src/hooks/useTimeTracking.ts` | Add time filter to staff locations query; wrap mutations with offline queue |
| `src/lib/capacitor/geolocation.ts` | Rewrite to use `@transistorsoft/capacitor-background-geolocation` on native |
| `src/lib/offlineQueue.ts` | New file -- IndexedDB offline queue |
| `src/hooks/useGeofenceMonitoring.ts` | Register OS-native geofences; add auto clock-in/out logic |
| `src/components/time-tracking/StaffLocationMap.tsx` | Replace placeholder with react-leaflet real map |
| `supabase/functions/validate-clock-event/index.ts` | New edge function for server-side geofence validation |
| Database migration | Add unique index, travel_logs, time_anomalies tables, photo columns |

### Priority Order
1. Fix stale location bug and unbounded query (Phase 1) -- immediate
2. Offline queue (Phase 2) -- critical for field reliability
3. Background geolocation plugin (Phase 3) -- core differentiator
4. Real map (Phase 4) -- high visibility improvement
5. Server-side validation + anomaly detection (Phase 5-6) -- compliance and trust

