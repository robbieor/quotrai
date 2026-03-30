

## Generate Foreman AI Hardhat Logo

**Goal**: Create a memorable, professional hardhat product identity image in your brand teal/green (#00FFB2), then show it for approval before replacing `tom-avatar.png` across the app.

### Brand Color Reference
- Primary: **#00FFB2** (teal/green, HSL 159 100% 50%)
- Dark variant: HSL 159 100% 45%

### Step 1 — Generate the logo
Use the Lovable AI image generation model (`google/gemini-3-pro-image-preview` for highest quality) via an edge function or script to create a hardhat icon with these specs:

- **Style**: Clean, bold, modern — a stylised construction hardhat seen from a slight 3/4 angle
- **Colour**: Brand teal #00FFB2 as the dominant colour, with darker teal shadows for depth
- **Background**: Transparent or solid dark (#0F172A) circle — works as both avatar and app icon
- **Feel**: Professional, memorable, iconic — think product logo, not clip art
- **Shape**: Square with rounded corners (works as avatar, PWA icon, favicon)
- **Resolution**: 512x512px minimum

### Step 2 — Show you the result
Save to `/mnt/documents/foreman-hardhat-logo.png` for your review.

### Step 3 — On approval, replace everywhere
Swap `src/assets/tom-avatar.png` with the new image. All 15+ components already import from that path, so a single file replacement updates:
- George/Foreman AI chat headers
- Morning briefing card
- Dashboard control header
- Landing page AI section
- Sidebar, mobile header, etc.

Also update PWA manifest icons and favicon if desired.

**No code changes needed until you approve the generated image.**

