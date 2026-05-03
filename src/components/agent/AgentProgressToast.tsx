import { useEffect } from "react";
import { toast } from "sonner";
import { AGENT_PROGRESS } from "@/lib/agentEvents";

/**
 * Surfaces voice-agent progress events as sonner toasts so the user sees
 * step-by-step status during multi-step operations.
 */
export function AgentProgressToast() {
  useEffect(() => {
    const handler = (e: Event) => {
      const { message, status } = (e as CustomEvent).detail ?? {};
      if (typeof message !== "string" || !message) return;
      if (status === "done") toast.success(`revamo AI: ${message}`);
      else if (status === "error") toast.error(`revamo AI: ${message}`);
      else toast(`revamo AI: ${message}`);
    };
    window.addEventListener(AGENT_PROGRESS, handler);
    return () => window.removeEventListener(AGENT_PROGRESS, handler);
  }, []);
  return null;
}
