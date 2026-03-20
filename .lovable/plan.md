

# App Store Readiness Plan

## Overview
Create a marketing assets page with dummy App Store submission instructions, generate app icons, and ensure the subscription workaround is solid for native builds. Keep email/password auth on native as-is — no Apple Sign-In for now.

## Tasks

### 1. Marketing Assets Page (`/app-store-assets`)
New page `src/pages/AppStoreAssets.tsx` with:
- **Submission checklist** — dummy step-by-step instructions for iOS App Store and Google Play Store
- **Icon requirements table** — all required sizes (1024×1024 for iOS, 512×512 for Android, adaptive icons)
- **App icon preview** — display the Quotr logo at multiple sizes
- **Store listing copy** — inline content from existing Play Store doc + new App Store fields (subtitle, keywords, promotional text)
- **Screenshot requirements** — device sizes and counts needed
- **Info.plist permissions** — list the required iOS permission strings
- **Privacy policy & terms links** — point to existing `/privacy` and `/terms`

Add route to `App.tsx` (public, unprotected).

### 2. App Store Listing Doc
New file `docs/app-store-listing.md` with Apple-specific fields: subtitle (30 chars), promotional text (170 chars), keywords (100 chars), category, age rating, etc.

### 3. Generate App Icons
Use AI image generation to create a polished 1024×1024 app icon matching Quotr branding (teal `#0D9488`). Save as:
- `public/icon-512.png`
- `public/icon-1024.png`

Update `public/manifest.json` to include the 512px icon.

### 4. Native Pricing Guard
Add `useIsNative` check to `src/pages/Pricing.tsx` — on native, show a simple card saying "Manage your subscription at quotr.work/settings" with an external link button instead of the full pricing page.

## Files to Create
- `src/pages/AppStoreAssets.tsx`
- `docs/app-store-listing.md`

## Files to Modify
- `src/App.tsx` — add `/app-store-assets` route
- `src/pages/Pricing.tsx` — add native guard
- `public/manifest.json` — add 512px icon entry

