import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";

console.log("[Foreman] Starting app...");

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
  if (hadSW && !sessionStorage.getItem("__quotr_sw_purged__")) {
    sessionStorage.setItem("__quotr_sw_purged__", "1");
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
  console.error("[Foreman] Root element not found");
}
