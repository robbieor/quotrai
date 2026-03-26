

## Add Trade Type Selector to Profile Settings

### Problem
The profile settings page shows Name, Email, and Currency but no Trade Type field. Users can't change their trade after onboarding, and the trade type drives which templates are shown.

### What Changes

| File | Change |
|------|--------|
| `src/pages/Settings.tsx` | Add a Trade Type `<Select>` dropdown between Email and Currency fields. Populate with the same trade types list used in onboarding. Add `selectedTradeType` state, sync from `profile?.trade_type`, include in `handleSaveProfile` update call. |
| `src/hooks/useProfile.ts` | Add `trade_type` to the `updateProfile` mutation's accepted fields type |

### Trade Types List
Reuse the same list from onboarding: Electrician, Plumber, HVAC Technician, Carpenter, Painter & Decorator, Roofer, Landscaper, Builder / General Contractor, Locksmith, Handyman, Cleaning Services, Pest Control, Pool & Spa, Pressure Washing, Fencing, Appliance Repair, Auto Detailing, Garage Door Services, Tree Services, Restoration, Solar, Flooring, Tiler, Property Maintenance, Concrete & Masonry, Window & Door Installation, Other.

### UI Detail
- Label: "Trade Type"
- Helper text: "Controls which templates are shown throughout the app"
- Placed after the Email field, before Currency

