

## Change Capacitor Bundle ID to `ie.foreman.app`

### What changes
Update `capacitor.config.ts` to replace the default Lovable bundle ID with your branded `ie.foreman.app`.

### File: `capacitor.config.ts`
- Change `appId` from `app.lovable.9b11f743854248068d3ea81555111caa` to `ie.foreman.app`
- Change `appName` from `Foreman` to `Foreman` (no change needed, already correct)

### After this change
On your Mac, run:
```bash
git pull
npx cap sync ios
```
Then in Xcode, clean the build folder (Product → Clean Build Folder) and rebuild. The new bundle ID will appear under Signing & Capabilities.

### Important
This must be done **before** your first App Store submission — the bundle ID is permanent once published.

