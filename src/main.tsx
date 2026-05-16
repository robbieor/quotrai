import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { initNativeChrome } from "./lib/native";

console.log("[revamo] Starting app...");

// Recover from stale-chunk errors after a fresh deploy: the cached index.html
// references old JS hashes that no longer exist, so dynamic imports 404.
// Force a single hard reload to fetch the new index.html + new hashes.
const RELOAD_KEY = "__revamo_chunk_reloaded__";
function isChunkLoadError(msg: unknown): boolean {
  const s = String(msg || "");
  return (
    s.includes("Importing a module script failed") ||
    s.includes("Failed to fetch dynamically imported module") ||
    s.includes("error loading dynamically imported module") ||
    /ChunkLoadError/i.test(s)
  );
}
function handleChunkError(msg: unknown) {
  if (!isChunkLoadError(msg)) return;
  if (sessionStorage.getItem(RELOAD_KEY)) return;
  sessionStorage.setItem(RELOAD_KEY, "1");
  window.location.reload();
}
window.addEventListener("error", (e) => handleChunkError(e?.message));
window.addEventListener("unhandledrejection", (e) =>
  handleChunkError((e?.reason as Error)?.message ?? e?.reason)
);
// Clear the guard on a successful load so future stale-deploys can recover too.
window.addEventListener("load", () => {
  setTimeout(() => sessionStorage.removeItem(RELOAD_KEY), 5000);
});

// Native iOS/Android polish (no-op on web).
initNativeChrome();

// Purge any legacy service workers and caches unconditionally.
// If stale SW assets are found, reload once so the user never sees an old UI.
(async () => {
  let hadSW = false;
  if ("serviceWorker" in navigator) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const r of regs) {
        await r.unregister();
        hadSW = true;
      }
    } catch { /* ignore */ }
  }
  if ("caches" in window) {
    try {
      const keys = await caches.keys();
      if (keys.length > 0) hadSW = true;
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch { /* ignore */ }
  }
  if (hadSW && !sessionStorage.getItem("__foreman_sw_purged__")) {
    sessionStorage.setItem("__foreman_sw_purged__", "1");
    window.location.reload();
  }
})();

const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(
    <HelmetProvider>
      <App />
    </HelmetProvider>
  );
} else {
  console.error("[revamo] Root element not found");
}
