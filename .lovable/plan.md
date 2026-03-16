

# Fix: Dashboard/Nav Flickering Between Old and New Versions

## Root Cause

**PWA service worker caching is serving stale assets on the published site.**

The `main.tsx` service worker cleanup only targets preview environments:
```
hostname.includes("id-preview--") || hostname.includes("lovableproject.com")
```

But the published site is `quotrai.lovable.app` — which **doesn't match either pattern**. So the old Workbox service worker (registered by VitePWA in production builds) continues to serve cached old JS bundles containing the previous dashboard layout and ungrouped sidebar. When the cache eventually expires or the new SW activates, you see the new version — hence the "switching" behavior.

## Fix — Two Changes

### 1. Expand service worker cleanup in `main.tsx`
Add `lovable.app` to the hostname check so service workers are also cleaned up on the published domain. This ensures any stale SW is immediately unregistered and caches purged.

### 2. Add `skipWaiting` + `clientsClaim` to VitePWA config in `vite.config.ts`
Force the new service worker to activate immediately instead of waiting for all tabs to close. This prevents the old cached version from ever being served once a new build deploys.

```typescript
workbox: {
  skipWaiting: true,
  clientsClaim: true,
  // ... existing config
}
```

These two changes will eliminate the stale cache problem. No other files need to change.

