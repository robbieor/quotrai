/**
 * Detects whether the app is running inside a Capacitor native shell (iOS/Android).
 * Returns false in all browser/web contexts — safe to use for conditional UI.
 */
export function useIsNative(): boolean {
  return (
    typeof (window as any).Capacitor !== "undefined" &&
    (window as any).Capacitor.isNativePlatform?.() === true
  );
}

/** Opens a URL in the device's default browser (outside the app). Falls back to window.open on web. */
export function openExternalUrl(url: string) {
  window.open(url, "_system");
}
