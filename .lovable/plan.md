

## Getting Foreman to the App Stores

You already have most of the infrastructure in place. Here's what's done and what's left.

### What's Already Built

| Component | Status |
|---|---|
| Capacitor config | ✅ Ready (`capacitor.config.ts`) |
| Android CI/CD workflow | ✅ GitHub Actions (`android-build.yml`) |
| iOS CI/CD workflow | ✅ GitHub Actions (`ios-build.yml`) |
| Play Store listing copy | ✅ Written (`docs/play-store-listing.md`) |
| App Store listing copy | ✅ Written (`docs/app-store-listing.md`) |
| Native billing guard (`useIsNative`) | ✅ Reader app model — no in-app purchases |
| PWA manifest & icons | ✅ Configured |
| App Store Assets page (`/app-store-assets`) | ✅ Exists for generating screenshots |

### What You Need To Do (Manual Steps)

These are things Lovable cannot do for you — they require developer accounts and local tools.

**1. Developer Accounts**
- **Apple Developer Program** — $99/year at [developer.apple.com](https://developer.apple.com)
- **Google Play Console** — $25 one-time at [play.google.com/console](https://play.google.com/console)

**2. Export to GitHub**
- Click **Export to GitHub** in Lovable (top-right menu)
- Clone the repo locally

**3. Local Build Setup**
```text
git clone <your-repo>
cd foreman
npm install
npm run build
npx cap add ios        # Mac only — requires Xcode
npx cap add android    # Requires Android Studio
npx cap sync
```

**4. iOS (Mac Required)**
- Open in Xcode: `npx cap open ios`
- Set bundle ID to `ie.foreman.app` (per your existing config)
- Add your 1024x1024 app icon (no alpha, no rounded corners)
- Add Info.plist permission strings (microphone, location, camera — already documented)
- Create signing certificate + provisioning profile in Apple Developer Portal
- Archive → Upload to App Store Connect → Submit for review

**5. Android**
- Open in Android Studio: `npx cap open android`
- Generate a release keystore: `keytool -genkey -v -keystore quotr-release.keystore -alias foreman -keyalg RSA -keysize 2048 -validity 10000`
- Build AAB: `./gradlew bundleRelease`
- Create app listing in Google Play Console
- Upload AAB to internal testing track → promote to production

**6. GitHub Actions (Automated Builds)**
Your CI/CD workflows are ready but need these GitHub Secrets configured:

**Android secrets:**
- `ANDROID_KEYSTORE_BASE64` — base64-encoded keystore file
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`
- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` — for auto-upload

**iOS secrets:**
- `BUILD_CERTIFICATE_BASE64` — Apple distribution certificate
- `P12_PASSWORD`
- `BUILD_PROVISION_PROFILE_BASE64`
- `KEYCHAIN_PASSWORD`
- `APPLE_TEAM_ID`
- `APP_STORE_CONNECT_API_KEY_ID` / `ISSUER_ID` / `API_KEY`

### Critical Reminder

Before building for stores, ensure `capacitor.config.ts` has the `server` block **commented out** (it already is) so the app loads from the bundled `dist/` folder, not the live preview URL.

### Recommended Order

1. Start with **Android** — faster review process (hours vs days)
2. Use **internal testing** track first to verify everything works
3. Then submit **iOS** — longer review, stricter guidelines
4. Use the `/app-store-assets` page to generate screenshots

### What I Can Help With From Here

- Generate store screenshots using the existing `/app-store-assets` route
- Update store listing copy in the docs
- Fix any native-specific UI issues (safe areas, status bar, etc.)
- Ensure the reader app model passes store review guidelines

