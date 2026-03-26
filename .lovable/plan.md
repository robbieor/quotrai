

## Fix Video Trial Text & Improve PWA Icon Quality

### Problem 1: Video still says "14 days"
The Remotion source already says "30 days" but the deployed MP4 (`public/foreman-demo.mp4`) was rendered before the fix. Since Remotion rendering requires the full build pipeline outside Lovable, we cannot re-render the video here. **However**, we can replace the autoplaying video's closing scene by overlaying the correct text, or note this as a manual re-render task.

**Practical fix**: The video is autoplaying in the landing page. Since re-rendering isn't possible in Lovable, we should add a note/task to re-render via the Remotion pipeline. The source is already correct.

### Problem 2: Faded/washed-out homescreen icon
The manifest uses `"purpose": "any maskable"` on both icons. This causes issues because:
- **maskable** icons need ~20% safe-zone padding (the OS crops the edges)
- **any** icons display as-is
- Combining both on one icon means either the maskable version looks too small, or the any version gets cropped

**Fix**: Split the icon entries — use the current icon for `any` and create a properly padded version for `maskable`. Also ensure the `apple-touch-icon.png` is high-quality (180x180 minimum, ideally from the 1024px source).

### Changes

| File | Change |
|------|--------|
| `public/manifest.json` | Split icon entries: separate `any` and `maskable` purposes, add 1024px icon entry |
| `index.html` | Add `sizes` attribute to apple-touch-icon link |

### Manifest update
```json
{
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icon-1024.png", "sizes": "1024x1024", "type": "image/png", "purpose": "any" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

### Note on video
The Remotion source is correct (30 days). The MP4 needs re-rendering via `cd remotion && bun run render` outside Lovable, then replace `public/foreman-demo.mp4`.

