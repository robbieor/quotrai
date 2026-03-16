

# Directing Native iOS Users to Subscribe on the Web

**The problem**: Once we hide all billing UI on native, users hitting a trial expiry, feature gate, or upgrade prompt will have no idea what to do. Right now every CTA says "Subscribe Now" and links to in-app billing pages — those will be gone on native.

## Solution: Native-aware messaging across all touchpoints

Rather than just hiding billing UI, we **replace** it with clear "manage on web" messaging at every point a user would encounter a paywall or upgrade prompt.

### Touchpoint 1 — Trial Banner (`TrialBanner.tsx`)
Currently shows "Subscribe Now" button linking to `/settings?tab=billing`.

**On native**, change to:
- **Expired**: "Trial ended — subscribe at quotr.work/settings to continue"
- **Expiring**: "Your trial ends in X days. Visit quotr.work to subscribe."
- Replace the button with a **"Open quotr.work"** link that opens the browser externally (using `@capacitor/browser` or `window.open`)

### Touchpoint 2 — Seat Guard (`SeatGuard.tsx`)
Currently shows "View Plans" linking to `/settings?tab=team-billing`.

**On native**, replace the card content with:
- "This feature requires a {tier} seat. Manage your subscription at **quotr.work/settings**"
- Button: **"Open in Browser"** → opens `https://quotr.work/settings?tab=team-billing` externally

### Touchpoint 3 — Upgrade Prompt Banners (`UpgradePromptBanner.tsx`)
Currently shows contextual upgrade nudges (trial expiring, voice limit, milestones).

**On native**, instead of hiding completely, show a **simplified version**:
- Keep the title and message (useful context)
- Replace the CTA button with **"Manage on quotr.work"** that opens the browser externally

### Touchpoint 4 — Upgrade Prompts Hook (`useUpgradePrompts.ts`)
**On native**, rewrite the `route` field to `https://quotr.work/settings?tab=billing` and the `cta` to "Open in Browser" so any component consuming prompts automatically gets web-redirect behavior.

### Touchpoint 5 — Select Plan Page (`SelectPlan.tsx`)
**On native**, redirect to dashboard or show a full-page message: "Subscription management is available at quotr.work" with an external link button.

## New utility needed

### `src/hooks/useIsNative.ts`
```typescript
export function useIsNative(): boolean {
  return typeof (window as any).Capacitor !== 'undefined' 
    && (window as any).Capacitor.isNativePlatform?.() === true;
}
```

### External link helper
Use `window.open('https://quotr.work/settings?tab=billing', '_system')` — Capacitor intercepts `_system` target and opens in the device's default browser outside the app.

## Files to create/modify

| File | Change |
|---|---|
| `src/hooks/useIsNative.ts` | **New** — native platform detection |
| `src/components/billing/TrialBanner.tsx` | Replace "Subscribe Now" button with external quotr.work link on native |
| `src/components/auth/SeatGuard.tsx` | Replace "View Plans" with "Open in Browser" → quotr.work |
| `src/components/billing/UpgradePromptBanner.tsx` | Replace CTA with external link on native |
| `src/hooks/useUpgradePrompts.ts` | Rewrite routes/CTAs to external URLs on native |
| `src/components/billing/SubscriptionPricing.tsx` | Return null on native |
| `src/pages/SelectPlan.tsx` | Show "manage on web" message on native |
| `src/pages/Settings.tsx` | Hide billing sub-tab content on native, keep "Team" tab |

**Zero impact on web** — `useIsNative()` returns `false` in all browser contexts, so every web code path is untouched.

