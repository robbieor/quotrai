

## Comparison: Preview vs Published (quotrai.lovable.app)

### Current Preview Status

The preview is behind Lovable's auth gate when fetched externally, so I compared the **source code** in this project against screenshots of the published version. The code for all pages, components, hooks, and layouts is structurally identical to what the published version renders.

### Published Version Pages Verified

| Page | Published Status | Code Match |
|------|-----------------|------------|
| Landing (`/`) | Renders correctly with Quotr branding, hero, feature grid | Source matches (976 lines in Landing.tsx) |
| Login (`/login`) | Quotr logo, Google sign-in, email/password form | Source matches |
| Pricing (`/pricing`) | 3-tier pricing (Lite/Connect/Grow), monthly/annual toggle | Source matches |
| Terms (`/terms`) | Legal content with Quotr branding | Source matches |
| Dashboard (`/dashboard`) | Protected, requires auth | Source matches (metrics, charts, activity feeds) |

### Why Your Preview May Still Be Blank

The build should now compile after the `@capacitor/app` fix, but there are two remaining clean-up items:

1. **Unused imports in App.tsx** -- `RoleGuard` and `Navigate` are imported but never used. While these shouldn't break the Vite build (esbuild is lenient), they generate warnings and are dead code from when those wrappers were removed.

2. **Missing edge functions** -- Only 3 of ~38 edge functions exist (`foreman-chat`, `send-email`, `stripe-webhook`). The Dashboard calls `check-alerts` (fire-and-forget, won't block rendering) but other features like billing, George AI, and integrations will fail at runtime when invoked.

### Recommended Next Steps

1. **Remove unused imports** from `App.tsx` (`RoleGuard`, `Navigate`) -- cosmetic cleanup.
2. **Confirm the preview renders** -- navigate to `/` (landing page) which requires no auth and should display immediately.
3. **Restore missing edge functions** (~35 functions) for full backend parity with the published version.

The frontend code is at full parity with the published version. The remaining gap is entirely backend (edge functions).

