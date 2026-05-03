import { useState } from "react";
import { useGlobalVoiceAgent } from "@/contexts/VoiceAgentContext";
import { AlertCircle, ChevronDown, ChevronUp, Clock, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Always-visible diagnostic strip for the voice screen.
 * Surfaces the latest ElevenLabs disconnect reason and the most recent
 * connection-attempt timeline events so users (and we) can troubleshoot
 * voice drops without opening the floating debug panel.
 */
export function VoiceDiagnosticStrip() {
  const [expanded, setExpanded] = useState(false);
  const { status, connectionPhase, isConnecting, debugState } = useGlobalVoiceAgent();

  const lastError = debugState.lastError?.trim() || "";
  const isDisconnect = lastError.toLowerCase().startsWith("disconnected");
  const recentTimeline = [...debugState.timeline].reverse().slice(0, expanded ? 12 : 4);

  // Only surface the strip when there is something useful to show:
  // an error, a disconnect, an active attempt, or recent timeline activity.
  const hasSignal =
    !!lastError ||
    isConnecting ||
    status === "connecting" ||
    connectionPhase !== "idle" ||
    debugState.timeline.length > 0;

  if (!hasSignal) return null;

  const phaseColor =
    status === "connected"
      ? "bg-primary"
      : isConnecting || status === "connecting"
      ? "bg-yellow-500 animate-pulse"
      : lastError
      ? "bg-red-500"
      : "bg-muted-foreground";

  return (
    <div
      className={cn(
        "mx-3 mt-2 mb-1 rounded-md border bg-card/80 backdrop-blur-sm text-xs",
        isDisconnect ? "border-red-500/40" : "border-border"
      )}
    >
      {/* Header row: phase + last disconnect reason */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/40 rounded-md transition-colors"
      >
        <span className={cn("h-2 w-2 rounded-full shrink-0", phaseColor)} />
        <span className="font-mono text-muted-foreground shrink-0">
          {connectionPhase}
        </span>

        {lastError ? (
          <span className="flex items-center gap-1.5 min-w-0 flex-1 text-red-500">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate" title={lastError}>
              {lastError}
            </span>
          </span>
        ) : (
          <span className="flex items-center gap-1.5 min-w-0 flex-1 text-muted-foreground">
            <Activity className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {status === "connected"
                ? "Voice connected"
                : isConnecting
                ? "Connecting to voice agent…"
                : "No active issues"}
            </span>
          </span>
        )}

        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
      </button>

      {/* Timeline */}
      {recentTimeline.length > 0 && (
        <div className="px-3 pb-2 pt-0.5 border-t border-border/60">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground mb-1 mt-1.5">
            <Clock className="h-3 w-3" />
            Attempt timeline
            {!expanded && debugState.timeline.length > 4 && (
              <span className="ml-auto normal-case tracking-normal">
                showing 4 of {debugState.timeline.length}
              </span>
            )}
          </div>
          <ol className="space-y-0.5 font-mono">
            {recentTimeline.map((entry, i) => (
              <li key={`${entry.time}-${i}`} className="flex gap-2 leading-snug">
                <span className="text-muted-foreground shrink-0 w-16">
                  {entry.time}
                </span>
                <span className="text-foreground/90 break-all">{entry.event}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
