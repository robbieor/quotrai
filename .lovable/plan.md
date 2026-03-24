

# Fix: Seat Count Mismatch (1 seat vs 1 of 2)

## Problem
The "Seats" card in TeamManagement uses `useSeatUsage()` → v1 `subscriptions.seat_count` (stale value of 2). The `SeatManagementTable` counts actual v2 `org_members_v2` rows (correct value of 1). Two sources of truth = contradictory numbers.

## Fix

### 1. Remove the stale "Seats" card — `src/components/settings/TeamManagement.tsx`
- Delete lines 127-166 (the `seatUsage` card with progress bar showing "1 of 2")
- Remove the `useSeatUsage` import and `seatUsage` / `seatUsageLoading` / `seatPercentage` variables
- Remove the `showAddSeatDialog` state and the Add Seat dialog (if present) — move that action into `SeatManagementTable`

### 2. Add "Add Seat" button to SeatManagementTable — `src/components/billing/SeatManagementTable.tsx`
- Add an "Add Seat" button in the card header (visible to owners only)
- Wire it to `useAddSeat()` from `useSubscription`
- The total footer already shows "{N} seats · €X/mo" — this becomes the single source of truth

### 3. Clean up unused imports in TeamManagement
- Remove `Progress`, `useSeatUsage`, `useAddSeat`, and related state variables

## Files

| File | Change |
|------|--------|
| `src/components/settings/TeamManagement.tsx` | Remove Seats card, stale v1 imports |
| `src/components/billing/SeatManagementTable.tsx` | Add "Add Seat" button for owners |

## Result
One seat count shown, derived from actual v2 member records. No more "1 of 2" vs "1 seat" contradiction.

