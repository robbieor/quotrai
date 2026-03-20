

# Fix App Icons to Use Real Quotr Logo

## Problem
The current `public/icon-512.png` and `public/icon-1024.png` are AI-generated icons that don't match the real Quotr logo. The App Store Assets page displays these fake icons.

## Fix
1. **Replace `public/icon-512.png` and `public/icon-1024.png`** — copy the real `src/assets/quotr-logo.png` to both paths (resized appropriately via script)
2. **Update `AppStoreAssets.tsx`** — change icon preview to use the imported `quotrLogo` asset instead of `/icon-1024.png` paths, so the page always shows the real logo
3. **Update download links** — point to the actual logo file

### Files to Modify
- `public/icon-512.png` — replace with real logo
- `public/icon-1024.png` — replace with real logo  
- `src/pages/AppStoreAssets.tsx` — use `quotrLogo` import for icon previews instead of `/icon-1024.png`

No new pages or components. No recreation of the assets page — just swapping the icon references.

