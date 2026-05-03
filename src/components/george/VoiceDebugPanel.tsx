import { useState } from "react";
import { useGlobalVoiceAgent } from "@/contexts/VoiceAgentContext";
import { Bug, ChevronDown, ChevronUp, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function VoiceDebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const { status, isConnecting, connectionPhase, debugState } = useGlobalVoiceAgent();

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 left-4 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border shadow-md text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        title="Open Voice Debug Panel"
      >
        <Bug className="h-3.5 w-3.5" />
        Voice Debug
      </button>
    );
  }

  const statusColor = (val: string) => {
    if (val.includes("success") || val.includes("granted") || val === "connected" || val === "true") return "text-primary";
    if (val.includes("failed") || val.includes("denied") || val.includes("error") || val.includes("FAILED")) return "text-red-500";
    if (val.includes("pending") || val.includes("requesting") || val === "connecting" || val.includes("dialing")) return "text-yellow-500";
    return "text-muted-foreground";
  };

  const rows: [string, string][] = [
    ["Connection Phase", connectionPhase],
    ["SDK Status", status],
    ["isConnecting", String(isConnecting)],
    ["Cancelled", String(debugState.attemptCancelled)],
    ["Mic Permission", debugState.micPermission],
    ["Token Fetch", debugState.tokenFetch],
    ["Transport", debugState.transportPath],
    ["onConnect Fired", String(debugState.onConnectFired)],
    ["Session Connected", String(debugState.sessionConnected)],
    ["Last Transcript", debugState.lastTranscript || "—"],
    ["Last Tool Call", debugState.lastToolCall || "—"],
    ["Webhook Status", debugState.lastWebhookStatus || "—"],
    ["Last Error", debugState.lastError || "—"],
  ];

  return (
    <div className={cn(
      "fixed bottom-24 left-4 z-50 w-80 bg-card border border-border rounded-lg shadow-xl overflow-hidden",
      "text-xs font-mono"
    )}>
      <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border">
        <div className="flex items-center gap-1.5 font-semibold text-foreground">
          <Bug className="h-3.5 w-3.5" />
          Voice Debug
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setIsMinimized(!isMinimized)} className="p-0.5 hover:bg-muted rounded">
            {isMinimized ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          <button onClick={() => setIsOpen(false)} className="p-0.5 hover:bg-muted rounded">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div className="px-3 py-2 space-y-1 max-h-48 overflow-y-auto border-b border-border">
            {rows.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-2">
                <span className="text-muted-foreground whitespace-nowrap">{label}:</span>
                <span className={cn("text-right truncate max-w-[180px]", statusColor(value))}>
                  {value}
                </span>
              </div>
            ))}
          </div>

          <div className="px-3 py-2 max-h-40 overflow-y-auto">
            <div className="text-muted-foreground font-semibold mb-1">Timeline</div>
            {debugState.timeline.length === 0 ? (
              <div className="text-muted-foreground italic">No events yet</div>
            ) : (
              <div className="space-y-0.5">
                {[...debugState.timeline].reverse().map((entry, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-muted-foreground whitespace-nowrap">{entry.time}</span>
                    <span className="text-foreground">{entry.event}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
