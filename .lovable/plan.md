

# Fix Broken Map + Beat Jobber on GPS Time Tracking

## The Map Problem

The StaffLocationMap uses `react-leaflet` with lazy loading via `Suspense`. The screenshot shows a blank card where the map should be — the Leaflet container is rendering but tiles are broken. Two probable causes:

1. **Leaflet CSS conflict with Tailwind**: Tailwind's preflight resets `img { max-width: 100% }` which breaks Leaflet tile rendering (tiles get squished). No override exists in `index.css`.
2. **Container size zero on mount**: `MapContainer` sets its size once on mount. Inside a lazy `Suspense` boundary, the container may have zero height when Leaflet initializes.

### Fix
- Add Leaflet CSS overrides to `index.css` to prevent Tailwind preflight from breaking tiles
- Add `invalidateSize()` call after mount to force Leaflet to recalculate
- Remove the `<div>` wrapper around `Circle` + `Marker` pairs (React-Leaflet requires direct Leaflet layer children, not DOM wrappers)

## Jobber Competitive Analysis

Jobber's GPS time tracking (their "Location Timers" feature) offers:

| Feature | Jobber | Quotr Today | Gap |
|---------|--------|-------------|-----|
| Auto clock-in on geofence entry | Yes (200m trigger) | No — manual only | **Major gap** |
| Auto clock-out on geofence exit | Yes (with 3min delay) | No | **Major gap** |
| Reminder notification instead of auto | Yes (user preference) | No | Gap |
| GPS waypoints on actions | Yes | Only on clock in/out | Minor gap |
| Live staff map | No (admin only) | Yes (Leaflet, broken) | **Quotr ahead** (when fixed) |
| Offline clock events | Basic | Yes (IndexedDB queue) | **Quotr ahead** |
| Geofence radius customisation | Fixed 200m | Adjustable 25-500m | **Quotr ahead** |
| Auto travel detection | No | Yes (travel_logs) | **Quotr ahead** |
| Mileage tracking integration | Separate feature | Integrated | **Quotr ahead** |
| Break tracking | No | No | Parity |

## Plan to Fix + Outpace Jobber

### 1. Fix the map (immediate) — `src/index.css` + `StaffLocationMap.tsx`

**index.css**: Add Leaflet overrides to prevent Tailwind from breaking tiles:
```css
.leaflet-container img { max-width: none !important; }
.leaflet-container { z-index: 0; }
```

**StaffLocationMap.tsx**:
- Remove the `<div key={site.id}>` wrapper around `Circle`/`Marker` pairs — use React fragments `<>` instead. `react-leaflet` expects Leaflet layer components as direct children, not HTML wrappers.
- Add a `MapReady` component that calls `map.invalidateSize()` on mount to handle the lazy-load sizing issue.

### 2. Auto clock-in/out via geofence notifications (Jobber's killer feature) — new `src/hooks/useAutoClockPrompt.ts` + update `ClockInOutCard.tsx`

This is Jobber's #1 differentiator. Implement a **smart prompt** system (not silent auto-clock, which users distrust):

- Use the browser Geolocation API `watchPosition` when the user has active scheduled jobs
- When the user enters a job's geofence radius → show a **push notification + in-app prompt**: "You've arrived at [Job Site]. Clock in?"
- When the user leaves geofence while clocked in → show prompt: "You've left [Job Site]. Clock out?"
- Store user preference: "Auto clock-in" / "Prompt me" / "Manual only" — this matches Jobber's flexibility but adds a third option
- 3-minute exit delay (matching Jobber) to avoid false triggers from GPS drift

### 3. Break tracking (beats Jobber — they don't have it) — migration + `ClockInOutCard.tsx`

- Add a "Take Break" / "Resume" button when clocked in
- Track break_start / break_end on time entries
- Deduct break time from billable hours automatically
- Show break duration in the timer display

### 4. Smart location accuracy indicator — `ClockInOutCard.tsx`

Current: shows raw "±125m accuracy" which means nothing to tradespeople.

New: traffic-light system:
- Green "GPS Locked" (< 30m accuracy)
- Amber "Approximate" (30-100m)
- Red "Weak Signal" (> 100m) with "Move outdoors" hint

### 5. Photo proof on clock-in (beats Jobber) — `ClockInOutCard.tsx`

Optional photo capture on clock-in for compliance-heavy trades (construction, facilities). Stored to file storage, linked to time entry.

## Files to Change

| File | Change |
|------|--------|
| `src/index.css` | Add Leaflet CSS overrides |
| `src/components/time-tracking/StaffLocationMap.tsx` | Fix Fragment wrappers, add invalidateSize on mount |
| `src/hooks/useAutoClockPrompt.ts` | New — geofence-triggered clock prompts |
| `src/components/time-tracking/ClockInOutCard.tsx` | Add break tracking, smart accuracy indicator, auto-clock prompt UI, optional photo capture |
| `src/components/time-tracking/GeofenceSettings.tsx` | Add auto-clock preference toggle (Auto / Prompt / Manual) |
| New migration | Add `break_start`, `break_end`, `break_duration_seconds`, `clock_in_photo_url` to `time_entries` |

## Priority Order

1. **Fix the map** — users literally can't see it right now
2. **Auto-clock geofence prompts** — closes the biggest Jobber gap
3. **Break tracking** — beats Jobber (they don't have it)
4. **Smart accuracy indicator** — quick UX win
5. **Photo proof** — premium differentiator for compliance trades

