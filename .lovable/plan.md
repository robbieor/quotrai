## Issue

The revamo logos are saved as RGB PNGs with a solid white background (no alpha channel), so they render as white squares against the dark sidebar/header instead of letting the teal "r" sit on the slate surface.

Affected files (all currently RGB, no alpha):
- `src/assets/foreman-logo.png` (used in sidebar, login, signup, forgot-password)
- `src/assets/revamo-logo.png`
- `public/favicon.png`, `public/icon-192.png`, `public/icon-512.png`, `public/icon-1024.png`, `public/apple-touch-icon.png`, `public/og-image.png`

## Plan

1. Run a Python/Pillow script to:
   - Open each logo PNG
   - Convert to RGBA
   - Replace near-white pixels (R,G,B all ≥ ~240) with transparent alpha
   - Preserve the teal "r" mark and any anti-aliasing edges (use a soft threshold + alpha falloff so edges don't get jagged)
   - Save back in place as proper RGBA PNG

2. Apply to both app assets (`src/assets/*-logo.png`) and all PWA / favicon variants in `public/`. The `og-image.png` will keep its dark themed background but the foreground logo composited onto it stays — only the standalone logos lose the white.

3. Verify by re-reading each file and confirming `mode == 'RGBA'` and corner pixels have `alpha == 0`.

4. No code changes — the existing `<img>` usages (sidebar, login card, etc.) automatically benefit once the PNG itself is transparent.

## Notes

- The favicon.ico will be regenerated from the transparent favicon.png so browser tabs also show transparency where the OS supports it.
- Apple touch icons traditionally render on a colored tile, but iOS handles transparency fine; no rounded mask added.