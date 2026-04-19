import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Activity, X, Loader2, Check } from "lucide-react";
import { useGlobalVoiceAgent } from "@/contexts/VoiceAgentContext";

interface ProgressItem {
  id: string;
  message: string;
  intent?: string;
  status: "running" | "complete";
  timestamp: number;
}

const ITEM_TTL_MS = 12_000;
const MAX_ITEMS = 6;

/**
 * LiveActionOverlay — bottom-left panel that streams George's progress toasts
 * during voice calls. Shows step-by-step what the agent is doing on screen.
 */
export function LiveActionOverlay() {
  const { status } = useGlobalVoiceAgent();
  const [items, setItems] = useState<ProgressItem[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const sweepRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ message: string; intent?: string; complete?: boolean }>;
      const { message, intent, complete } = ce.detail || ({} as any);
      if (!message) return;

      setItems((prev) => {
        // If completing the previous item, mark it complete
        if (complete && prev.length > 0) {
          const updated = [...prev];
          updated[updated.length - 1] = { ...updated[updated.length - 1], status: "complete" };
          return updated;
        }
        const next: ProgressItem = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          message,
          intent,
          status: "running",
          timestamp: Date.now(),
        };
        // Mark previous as complete when a new step starts
        const previous = prev.map((p, i) =>
          i === prev.length - 1 && p.status === "running" ? { ...p, status: "complete" as const } : p
        );
        return [...previous, next].slice(-MAX_ITEMS);
      });
      setCollapsed(false);
    };

    window.addEventListener("george:progress", handler as EventListener);
    return () => window.removeEventListener("george:progress", handler as EventListener);
  }, []);

  // Auto-expire old items
  useEffect(() => {
    sweepRef.current = setInterval(() => {
      setItems((prev) => prev.filter((i) => Date.now() - i.timestamp < ITEM_TTL_MS));
    }, 1000);
    return () => {
      if (sweepRef.current) clearInterval(sweepRef.current);
    };
  }, []);

  // Hide entirely when not in a call AND no recent items
  if (items.length === 0) return null;
  if (status !== "connected" && items.every((i) => Date.now() - i.timestamp > 8000)) return null;

  const currentIntent = items[items.length - 1]?.intent;

  return (
    <div
      className={cn(
        "fixed left-4 z-40",
        "max-w-sm w-[calc(100vw-2rem)] sm:w-80",
        "bg-card border border-border rounded-2xl shadow-2xl",
        "overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300"
      )}
      style={{ bottom: "calc(6rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-primary/5 border-b border-border hover:bg-primary/10 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Activity className="h-4 w-4 text-primary shrink-0" />
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground truncate">
            {currentIntent || "Foreman AI working"}
          </span>
        </div>
        <X className={cn("h-4 w-4 text-muted-foreground transition-transform", collapsed && "rotate-45")} />
      </button>

      {!collapsed && (
        <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
          {items.map((item) => (
            <div key={item.id} className="flex items-start gap-2.5 text-sm animate-in fade-in slide-in-from-left-2 duration-200">
              <div className="mt-0.5 shrink-0">
                {item.status === "complete" ? (
                  <div className="w-4 h-4 rounded-full bg-primary/15 flex items-center justify-center">
                    <Check className="h-3 w-3 text-primary" />
                  </div>
                ) : (
                  <Loader2 className="h-4 w-4 text-primary animate-spin" />
                )}
              </div>
              <span
                className={cn(
                  "leading-snug",
                  item.status === "complete" ? "text-muted-foreground" : "text-foreground font-medium"
                )}
              >
                {item.message}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
