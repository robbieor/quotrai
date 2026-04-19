import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * NavigationBridge — must be mounted INSIDE BrowserRouter.
 * Listens for window CustomEvent "george:navigate" dispatched by VoiceAgentContext
 * (which lives ABOVE the router). This decouples the voice agent from react-router.
 */
export function NavigationBridge() {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ route: string; replace?: boolean }>;
      const { route, replace } = ce.detail || ({} as any);
      if (typeof route === "string" && route.startsWith("/")) {
        navigate(route, { replace: !!replace });
      }
    };
    window.addEventListener("george:navigate", handler as EventListener);
    return () => window.removeEventListener("george:navigate", handler as EventListener);
  }, [navigate]);

  return null;
}
