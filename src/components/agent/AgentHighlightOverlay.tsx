import { useEffect, useState } from "react";
import { AGENT_HIGHLIGHT } from "@/lib/agentEvents";

type Box = {
  top: number;
  left: number;
  width: number;
  height: number;
  label?: string;
};

/**
 * Draws a pulsing primary-green ring around the section the voice agent
 * highlighted, with an optional label chip. Auto-clears after ~3.5s.
 */
export function AgentHighlightOverlay() {
  const [box, setBox] = useState<Box | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const { section, label } = (e as CustomEvent).detail ?? {};
      if (typeof section !== "string") return;
      const el = document.querySelector(
        `[data-section="${section}"]`
      ) as HTMLElement | null;
      if (!el) {
        console.warn(`[revamo AI] section not on page: ${section}`);
        return;
      }
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      // Allow scroll to settle before measuring
      setTimeout(() => {
        const r = el.getBoundingClientRect();
        setBox({
          top: r.top,
          left: r.left,
          width: r.width,
          height: r.height,
          label,
        });
        setTimeout(() => setBox(null), 3500);
      }, 350);
    };
    window.addEventListener(AGENT_HIGHLIGHT, handler);
    return () => window.removeEventListener(AGENT_HIGHLIGHT, handler);
  }, []);

  if (!box) return null;

  return (
    <div
      className="pointer-events-none fixed z-[9999] rounded-lg ring-4 ring-primary animate-pulse"
      style={{
        top: box.top - 6,
        left: box.left - 6,
        width: box.width + 12,
        height: box.height + 12,
        boxShadow: "0 0 0 4px hsl(var(--primary) / 0.35)",
      }}
    >
      {box.label && (
        <div className="absolute -top-8 left-0 rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground shadow-lg">
          {box.label}
        </div>
      )}
    </div>
  );
}
