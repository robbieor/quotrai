import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Mic, Sparkles, CheckCircle2, AlertCircle, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGlobalVoiceAgent } from "@/contexts/VoiceAgentContext";
import {
  AGENT_NAVIGATE,
  AGENT_HIGHLIGHT,
  AGENT_PROGRESS,
  AGENT_THINKING,
  AGENT_TOOL_CALL,
  AGENT_TRANSCRIPT,
  type AgentToolStatus,
  type AgentTranscriptRole,
} from "@/lib/agentEvents";

type ToolEntry = {
  id: string;
  tool: string;
  label: string;
  status: AgentToolStatus;
  detail?: string;
  ts: number;
};

type TranscriptEntry = {
  id: string;
  role: AgentTranscriptRole;
  text: string;
  ts: number;
};

const AUTO_DISMISS_MS = 6000;
const MAX_TOOLS = 5;

/**
 * LiveAgentHUD — cinematic glass overlay that surfaces what the voice agent
 * is doing in real time. Listens to the unified agent event stream and
 * auto-shows during voice calls or recent agent activity.
 */
export function LiveAgentHUD() {
  const { status, isSpeaking } = useGlobalVoiceAgent();
  const location = useLocation();

  const [thinking, setThinking] = useState(false);
  const [tools, setTools] = useState<ToolEntry[]>([]);
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [progress, setProgress] = useState<{ message: string; status: string } | null>(null);
  const [navFlash, setNavFlash] = useState<string | null>(null);
  const [forceShow, setForceShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const lastActivityRef = useRef<number>(0);
  const idCounter = useRef(0);
  const nextId = () => `${Date.now()}-${idCounter.current++}`;

  const voiceConnected = status === "connected";

  // Reset dismissed flag when a new call starts
  useEffect(() => {
    if (voiceConnected) setDismissed(false);
  }, [voiceConnected]);

  // Subscribe to agent events
  useEffect(() => {
    const bump = () => {
      lastActivityRef.current = Date.now();
      setForceShow(true);
    };

    const onTool = (e: Event) => {
      const d = (e as CustomEvent).detail as ToolEntry;
      bump();
      setTools((prev) => {
        // If running tool with same name exists, upgrade it
        const idx = prev.findIndex((t) => t.tool === d.tool && t.status === "running");
        if (idx >= 0 && d.status !== "running") {
          const next = [...prev];
          next[idx] = { ...next[idx], status: d.status, detail: d.detail, ts: d.ts };
          return next.slice(-MAX_TOOLS);
        }
        return [...prev, { ...d, id: nextId() }].slice(-MAX_TOOLS);
      });
    };

    const onTranscript = (e: Event) => {
      const d = (e as CustomEvent).detail as TranscriptEntry;
      bump();
      setTranscripts((prev) => [...prev, { ...d, id: nextId() }].slice(-2));
    };

    const onThinking = (e: Event) => {
      const { thinking: t } = (e as CustomEvent).detail ?? {};
      setThinking(!!t);
      if (t) bump();
    };

    const onProgress = (e: Event) => {
      const { message, status } = (e as CustomEvent).detail ?? {};
      bump();
      setProgress({ message, status });
    };

    const onNavigate = (e: Event) => {
      const { reason } = (e as CustomEvent).detail ?? {};
      bump();
      if (reason) {
        setNavFlash(reason);
        setTimeout(() => setNavFlash(null), 1400);
      }
    };

    const onHighlight = (e: Event) => {
      const { label } = (e as CustomEvent).detail ?? {};
      bump();
      if (label) {
        setTools((prev) =>
          [...prev, { id: nextId(), tool: "highlight", label: `Highlighting ${label}`, status: "done" as const, ts: Date.now() }].slice(-MAX_TOOLS)
        );
      }
    };

    window.addEventListener(AGENT_TOOL_CALL, onTool);
    window.addEventListener(AGENT_TRANSCRIPT, onTranscript);
    window.addEventListener(AGENT_THINKING, onThinking);
    window.addEventListener(AGENT_PROGRESS, onProgress);
    window.addEventListener(AGENT_NAVIGATE, onNavigate);
    window.addEventListener(AGENT_HIGHLIGHT, onHighlight);
    return () => {
      window.removeEventListener(AGENT_TOOL_CALL, onTool);
      window.removeEventListener(AGENT_TRANSCRIPT, onTranscript);
      window.removeEventListener(AGENT_THINKING, onThinking);
      window.removeEventListener(AGENT_PROGRESS, onProgress);
      window.removeEventListener(AGENT_NAVIGATE, onNavigate);
      window.removeEventListener(AGENT_HIGHLIGHT, onHighlight);
    };
  }, []);

  // Auto-collapse after inactivity (only when not in a live call)
  useEffect(() => {
    if (voiceConnected) return;
    if (!forceShow) return;
    const timer = setInterval(() => {
      if (Date.now() - lastActivityRef.current > AUTO_DISMISS_MS) {
        setForceShow(false);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [forceShow, voiceConnected]);

  // Hide on auth / portal / public routes
  const shouldRenderOnRoute = useMemo(() => {
    const p = location.pathname;
    if (p === "/" || p.startsWith("/login") || p.startsWith("/signup") || p.startsWith("/forgot") ||
        p.startsWith("/reset") || p.startsWith("/quote/") || p.startsWith("/invoice/") ||
        p.startsWith("/customer-") || p.startsWith("/trade/") || p.startsWith("/pricing") ||
        p.startsWith("/terms") || p.startsWith("/privacy") || p.startsWith("/storefront")) {
      return false;
    }
    return true;
  }, [location.pathname]);

  const visible = !dismissed && shouldRenderOnRoute && (voiceConnected || forceShow);

  if (!visible) return null;

  const orbState = voiceConnected
    ? isSpeaking
      ? "speaking"
      : thinking
      ? "thinking"
      : "listening"
    : tools.some((t) => t.status === "running")
    ? "thinking"
    : "idle";

  const stateLine = voiceConnected
    ? isSpeaking
      ? "Speaking…"
      : thinking
      ? "Thinking…"
      : "Listening…"
    : tools.some((t) => t.status === "running")
    ? "Working…"
    : progress?.message ?? "Revamo AI";

  const lastUser = [...transcripts].reverse().find((t) => t.role === "user");

  return (
    <>
      {/* Route flash */}
      {navFlash && (
        <div className="fixed inset-x-0 top-0 z-[60] pointer-events-none">
          <div className="mx-auto mt-3 w-fit max-w-[90%] rounded-full bg-primary text-primary-foreground px-4 py-1.5 text-xs font-medium shadow-lift animate-fade-in">
            <Sparkles className="inline-block w-3 h-3 mr-1.5 -mt-0.5" />
            {navFlash}
          </div>
        </div>
      )}

      {/* Main HUD card */}
      <div
        className={cn(
          "fixed z-50 pointer-events-auto",
          "left-1/2 -translate-x-1/2",
          "bottom-4 md:bottom-6",
          "w-[min(440px,calc(100vw-1.5rem))]",
          "animate-fade-up"
        )}
        role="status"
        aria-live="polite"
      >
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-background/85 backdrop-blur-xl shadow-lift">
          {/* Ambient gradient glow */}
          <div
            className={cn(
              "pointer-events-none absolute inset-0 opacity-60 transition-opacity duration-500",
              orbState === "speaking" && "opacity-90",
              orbState === "idle" && "opacity-30"
            )}
            style={{
              background:
                "radial-gradient(120% 80% at 0% 0%, hsl(var(--primary) / 0.18), transparent 60%), radial-gradient(120% 80% at 100% 100%, hsl(var(--primary) / 0.10), transparent 60%)",
            }}
          />

          <div className="relative p-3.5">
            {/* Header row: orb + state + close */}
            <div className="flex items-center gap-3">
              <Orb state={orbState} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-manrope lowercase text-sm font-semibold tracking-tight">
                    revamo
                  </span>
                  <span className="text-xs text-muted-foreground truncate">{stateLine}</span>
                </div>
                {lastUser && (
                  <div className="mt-0.5 text-xs text-muted-foreground truncate italic">
                    "{lastUser.text}"
                  </div>
                )}
              </div>
              {!voiceConnected && (
                <button
                  onClick={() => setDismissed(true)}
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted transition-colors"
                  aria-label="Dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Tool timeline */}
            {tools.length > 0 && (
              <div className="mt-3 space-y-1.5 border-t border-border/50 pt-3">
                {tools.map((t) => (
                  <ToolRow key={t.id} entry={t} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function Orb({ state }: { state: "speaking" | "listening" | "thinking" | "idle" }) {
  return (
    <div className="relative w-9 h-9 shrink-0">
      {/* Pulse rings during active states */}
      {(state === "speaking" || state === "listening") && (
        <>
          <span className="absolute inset-0 rounded-full bg-primary/30 animate-ring-pulse" />
          <span className="absolute inset-0 rounded-full bg-primary/20 animate-ring-pulse-delay-1" />
        </>
      )}
      <div
        className={cn(
          "relative w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300",
          "bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-medium",
          state === "speaking" && "scale-110",
          state === "thinking" && "animate-pulse"
        )}
      >
        {state === "thinking" ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Mic className="w-4 h-4" />
        )}
      </div>
    </div>
  );
}

function ToolRow({ entry }: { entry: ToolEntry }) {
  const { label, status, detail } = entry;
  return (
    <div className="flex items-start gap-2.5 text-xs animate-fade-in">
      <div className="mt-0.5 shrink-0">
        {status === "running" && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
        {status === "done" && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
        {status === "error" && <AlertCircle className="w-3.5 h-3.5 text-destructive" />}
      </div>
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "font-medium truncate",
            status === "error" ? "text-destructive" : "text-foreground"
          )}
        >
          {label}
        </div>
        {detail && (
          <div className="text-muted-foreground truncate text-[11px] leading-tight">{detail}</div>
        )}
      </div>
    </div>
  );
}
