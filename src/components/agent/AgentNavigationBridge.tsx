import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AGENT_NAVIGATE, AGENT_SCROLL } from "@/lib/agentEvents";

/**
 * AgentNavigationBridge — must be mounted INSIDE <BrowserRouter>.
 * Listens for registry-driven navigation/scroll events dispatched by the
 * voice agent's client tools and applies them to the router/DOM.
 */
export function AgentNavigationBridge() {
  const navigate = useNavigate();

  useEffect(() => {
    const navHandler = (e: Event) => {
      const { path, reason } = (e as CustomEvent).detail ?? {};
      if (typeof path !== "string" || !path.startsWith("/")) return;
      if (reason) toast("Foreman AI", { description: reason });
      navigate(path);
    };

    const scrollHandler = (e: Event) => {
      const { section } = (e as CustomEvent).detail ?? {};
      if (typeof section !== "string") return;
      const el = document.querySelector(
        `[data-section="${section}"]`
      ) as HTMLElement | null;
      if (!el) {
        console.warn(`[Foreman AI] section not on page: ${section}`);
        return;
      }
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    window.addEventListener(AGENT_NAVIGATE, navHandler);
    window.addEventListener(AGENT_SCROLL, scrollHandler);
    return () => {
      window.removeEventListener(AGENT_NAVIGATE, navHandler);
      window.removeEventListener(AGENT_SCROLL, scrollHandler);
    };
  }, [navigate]);

  return null;
}
