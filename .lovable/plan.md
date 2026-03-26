

## Fix Home Screen App Icon (PWA)

### Problem
The PWA icons (`icon-192.png`, `icon-512.png`) are still the old Quotr branding. When users add the app to their home screen, they see the wrong icon.

### Solution
Generate new properly sized PWA icons from the existing `foreman-logo.png` and update references.

### Steps

**Step 1: Generate new icons**
Use a script to resize `public/foreman-logo.png` into:
- `icon-192.png` (192x192) — Android PWA
- `icon-512.png` (512x512) — Android PWA splash
- `apple-touch-icon.png` (180x180) — iOS home screen

Place them with a white or transparent background, logo centered.

**Step 2: Update `index.html`**
- Change the `apple-touch-icon` href from `/icon-192.png` to `/apple-touch-icon.png` with `sizes="180x180"`

**Step 3: Update `manifest.json`**
- Add a `"purpose": "any maskable"` field to the icon entries for better Android adaptive icon support
- Optionally add the 180x180 entry

### Files to Change

| File | Change |
|------|--------|
| `public/icon-192.png` | Overwrite with Foreman-branded 192x192 icon |
| `public/icon-512.png` | Overwrite with Foreman-branded 512x512 icon |
| `public/apple-touch-icon.png` | New 180x180 icon for iOS |
| `index.html` | Update apple-touch-icon href |
| `public/manifest.json` | Add `purpose` field to icon entries |

