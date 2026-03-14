

## Fix Build Errors and Complete Restoration

### Current Build Errors (2 issues)

**Error 1: VoiceAgentContext.tsx** — The ElevenLabs stub returns `status` as `string` but the context expects `ConnectionStatus` type.
- Fix: Cast the return type in `elevenlabs-stub.ts` to `"disconnected"` as a literal type (not `as string`).

**Error 2: Capacitor modules missing** — `@capacitor/geolocation`, `@capacitor/local-notifications`, `@capacitor/app` are not in `package.json`.
- Fix: Install `@capacitor/core`, `@capacitor/geolocation`, `@capacitor/local-notifications`, and `@capacitor/app` as dependencies. These are needed for the native mobile strategy (GPS tracking, geofence notifications).

### Changes

1. **`src/contexts/elevenlabs-stub.ts`** — Change `"disconnected" as string` to `"disconnected" as const` so TypeScript infers the literal type.

2. **`package.json`** — Add Capacitor dependencies:
   - `@capacitor/core`
   - `@capacitor/geolocation`
   - `@capacitor/local-notifications`
   - `@capacitor/app`

This will resolve all 4 build errors and get the app compiling. Once building, the app should render the landing page, login, pricing, and all other pages matching the published version at quotrai.lovable.app.

### After Build Fix — Visual Comparison Plan

Once the app builds, the next step is a page-by-page comparison between the restored preview and the published version at quotrai.lovable.app to identify any delta features that were added after the Remix was created. Key pages to compare:
- Landing page (hero, feature cards, ROI calculator, testimonials)
- Pricing page (3-tier layout)
- Login / Signup / Request Access pages
- Dashboard (after auth)
- All protected pages (Jobs, Invoices, Quotes, etc.)

Any visual or functional differences found will be rebuilt to match the published version exactly.

