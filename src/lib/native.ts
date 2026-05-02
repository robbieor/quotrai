/**
 * Native runtime initialisation for iOS/Android (Capacitor).
 * Safe to call from web — guards on Capacitor.isNativePlatform().
 */
import { Capacitor } from "@capacitor/core";

export async function initNativeChrome() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    // Match the dark navy header so iOS doesn't show a white strip above content.
    await StatusBar.setStyle({ style: Style.Dark });
    if (Capacitor.getPlatform() === "android") {
      await StatusBar.setBackgroundColor({ color: "#0f172a" });
    }
    await StatusBar.setOverlaysWebView({ overlay: true });
  } catch (e) {
    console.warn("[native] StatusBar init failed", e);
  }

  try {
    const { Keyboard, KeyboardResize } = await import("@capacitor/keyboard");
    // Native resize keeps form inputs visible above the keyboard.
    await Keyboard.setResizeMode({ mode: KeyboardResize.Native });
    await Keyboard.setScroll({ isDisabled: false });
  } catch (e) {
    console.warn("[native] Keyboard init failed", e);
  }
}
