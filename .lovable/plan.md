

## Root Cause: Build Is Completely Broken (Preview Returns HTTP 404)

The browser automation confirms the Vite dev server is returning a **Chrome-level 404** — the server itself is not serving any content. This means the build is crashing before Vite can start.

### Most Likely Crash Causes

After reviewing every import chain, dependency, and config file, two issues stand out:

**1. VitePWA plugin referencing missing assets**
`vite.config.ts` uses `VitePWA` with `manifest: false` (expects `public/manifest.json`), and `includeAssets: ["favicon.ico", "icon-192.png"]`. The `public/` directory is **completely empty** — none of these files exist. The workbox precache configuration may crash during initialization when it can't resolve these assets.

**Fix:** Remove VitePWA from `vite.config.ts` entirely, or create the missing `public/manifest.json`, `public/favicon.ico`, and `public/icon-192.png`. Removing VitePWA is the safest quick fix since PWA is irrelevant in the Lovable preview.

**2. Dependency version conflict: `@dnd-kit/sortable@^10` vs `@dnd-kit/core@^6`**
`@dnd-kit/sortable` v10 is a major version that requires `@dnd-kit/core` v7+. The lockfile has core@6 — this may cause module resolution failures during bundling.

**Fix:** Downgrade `@dnd-kit/sortable` to `^8.0.0` (compatible with core@6) or upgrade `@dnd-kit/core` to `^7.0.0`.

### Visual Parity Gap with quotr.work

The published app at **quotr.work** has a significantly different landing page from what's in the current codebase:

| Element | quotr.work (live) | Current code |
|---------|-------------------|--------------|
| Headline | "Talk to your business. It talks back." | Different hero content |
| CTA | "Get Founding Member Access" | "Start your free trial" |
| Nav items | ROI Calculator, Customer Portal, Login, currency selector | Different nav structure |
| Hero visual | Foreman AI chat widget mockup | Dashboard showcase |
| Feature flow | Lead → Quote → Job → Expenses → Invoice → Profit | Platform feature grid |

This means **the current codebase is NOT the same as what's deployed at quotr.work**. The quotr.work version was likely a later iteration that never made it into this project's codebase.

### Execution Plan

**Step 1: Fix the build crash (immediate)**
- Remove VitePWA from `vite.config.ts` and remove `vite-plugin-pwa` from dependencies
- Also remove `HMR overlay: false` config that can mask errors
- Fix `@dnd-kit` version conflict (downgrade sortable to ^8 or upgrade core to ^7)
- Delete the `bun.lock` to force clean dependency resolution

**Step 2: Verify preview renders**
- Navigate to `/` (public landing page, no auth required)
- Navigate to `/login` to verify authenticated flow

**Step 3: Address quotr.work visual parity**
- Once the build is fixed, we need to determine if we should update the Landing page and other content to match quotr.work, or if the current codebase content is acceptable
- The logged-in pages (dashboard, jobs, invoices etc.) need to be verified after you log in

### Note on Edge Functions
Only 3 of ~38 edge functions exist. Features like Stripe billing, George AI chat, Xero/QuickBooks sync, and email notifications will fail at runtime. These are a separate restoration task after the build is fixed.

