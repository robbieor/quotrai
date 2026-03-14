import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

console.log("[Quotr] Starting app...");

const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(<App />);
} else {
  console.error("[Quotr] Root element not found");
}
