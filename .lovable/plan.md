

# Export Quotr to GitHub + iOS (Capacitor/Xcode)

This plan covers four deliverables: a production-ready README, an updated `.env.example`, a Capacitor configuration for iOS, and updated `.gitignore`. The project structure is already clean — no Lovable-specific runtime dependencies need removing (the `lovable-tagger` is a devDependency and only runs in dev mode).

## 1. New/Updated Files

### A. `README.md` (new)
Production README covering:
- Project overview
- Prerequisites (Node 22+, npm)
- Local setup: `npm install` → copy `.env.example` → `npm run dev`
- Build: `npm run build`
- iOS development: `npx cap add ios` → `npx cap sync` → `npx cap open ios`
- Environment variables reference
- Git push commands

### B. `.env.example` (rewrite)
Replace the outdated Expo/.SQLite template with the actual variables this project uses:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_PROJECT_ID=your-project-id
```

### C. `capacitor.config.ts` (new)
```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.9b11f743854248068d3ea81555111caa',
  appName: 'Quotr',
  webDir: 'dist',
  server: {
    // Remove or comment out for production builds
    url: 'https://9b11f743-8542-4806-8d3e-a81555111caa.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    Geolocation: { /* uses default config */ },
    LocalNotifications: { /* uses default config */ },
  },
  ios: {
    contentInset: 'automatic',
  },
};

export default config;
```

### D. `ios/App/App/Info.plist` additions (post `cap add ios`)
Document required permission strings for the user to add in Xcode:
- `NSMicrophoneUsageDescription` — "Quotr uses the microphone for Foreman AI voice commands"
- `NSLocationWhenInUseUsageDescription` — "Quotr uses your location to verify job site attendance"
- `NSLocationAlwaysAndWhenInUseUsageDescription` — "Quotr tracks your location in the background for GPS time tracking"
- `NSCameraUsageDescription` — "Quotr uses the camera for site visit verification photos"

### E. `.gitignore` (update)
Add Capacitor/Xcode artifacts and clean up stale Expo entries:
```
node_modules/
dist/
*.tsbuildinfo
.DS_Store
.env
.env.local
ios/App/Pods/
ios/App/build/
android/app/build/
```

### F. Install `@capacitor/cli` as devDependency
Already have `@capacitor/core`, `@capacitor/geolocation`, `@capacitor/local-notifications`, `@capacitor/app`. Need to add:
- `@capacitor/cli` (dev)
- `@capacitor/ios`
- `@capacitor/android`

## 2. No files to remove
- `lovable-tagger` is dev-only and harmless in production builds
- The existing `src/integrations/supabase/client.ts` stays as-is

## 3. Implementation Summary

| File | Action |
|---|---|
| `README.md` | Create — full setup/build/iOS guide |
| `.env.example` | Rewrite — match actual Vite env vars |
| `capacitor.config.ts` | Create — iOS wrapper config |
| `.gitignore` | Update — add iOS/Android build artifacts |
| `package.json` | Add `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android` |

The README will include the exact terminal commands for cloning, building, syncing Capacitor, opening Xcode, and the Info.plist permissions the user must add manually in Xcode for microphone, location, and camera access.

