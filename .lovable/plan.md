

# Fix: Signup page trust points and remaining "Quotr" references

## Issues Found

1. **`src/pages/Signup.tsx` line 18** — Says "7-day full Pro trial" instead of "14-day free trial"
2. **`supabase/functions/send-drip-email/index.ts` line 10** — `APP_URL` still points to `https://quotrai.lovable.app` instead of `https://foreman.world`
3. **Remotion variable names** (`quotrOpacity`, `quotrX`) — cosmetic only; the rendered text already says "Foreman". Low priority rename for code hygiene.

The "Join hundreds of tradespeople running their business with Quotr" and the fake electrician testimonial are not in the current codebase — likely a stale browser cache. A hard refresh should clear those.

## Changes

### 1. `src/pages/Signup.tsx` — Fix trust points (line 18)

```typescript
// Before
{ icon: Clock, text: "7-day full Pro trial" },

// After
{ icon: Clock, text: "14-day free trial" },
```

### 2. `supabase/functions/send-drip-email/index.ts` — Fix APP_URL (line 10)

```typescript
// Before
const APP_URL = "https://quotrai.lovable.app";

// After
const APP_URL = "https://foreman.world";
```

### 3. `remotion/src/scenes/Scene2MeetForeman.tsx` — Rename legacy variables (optional, code hygiene)

Rename `quotrOpacity` → `foremanOpacity` and `quotrX` → `foremanX` across the file. No visual change.

