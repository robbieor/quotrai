

# Fix PWA Cache Flicker Between Old and New Versions

**Root cause**: The VitePWA plugin generates a service worker for production builds that caches all assets. Even though `main.tsx` tries to unregister service workers on `lovable.app`, the cleanup is **asynchronous** — the old cached version renders first, then the cleanup fires, then a reload shows the new version. This creates the visible "flip" between old and new UI.

The current cleanup also only targets `lovable.app` and `lovableproject.com` — if users visit the published URL (`quotrai.lovable.app`), the SW registers caches, and subsequent deploys fight with stale cache.

## Plan

### 1. Disable PWA plugin entirely in `vite.config.ts`
Since you're shipping via Capacitor for native and the web app doesn't need offline-first PWA behavior, remove the `VitePWA` plugin completely. This stops generating new service workers on every build.

### 2. Make SW cleanup in `main.tsx` unconditional and blocking
Remove the hostname check so it runs everywhere (covers `quotrai.lovable.app`, custom domains, etc.). Force a **one-time reload** after cleanup so the user never sees stale content:

```
if ("serviceWorker" in navigator) {
  // Unregister all SWs and purge caches
  // If any were found, reload once to ensure clean slate
}
```

### 3. Remove `vite-plugin-pwa` dependency
Clean up `package.json` — the plugin import in `vite.config.ts` will be removed so the dependency is no longer needed.

## Files to modify

| File | Change |
|---|---|
| `vite.config.ts` | Remove `VitePWA` import and plugin entry |
| `src/main.tsx` | Make SW cleanup unconditional; add one-time reload after purge |
| `package.json` | Remove `vite-plugin-pwa` from devDependencies |

**Web app**: No PWA service worker means no stale cache flicker. The app loads fresh every time.
**Native app**: Unaffected — Capacitor doesn't use the PWA service worker.

