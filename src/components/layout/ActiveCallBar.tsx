import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronDown, ChevronUp, GripVertical, MessageSquare, Mic, MicOff, PhoneOff, Signal, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGlobalVoiceAgent } from "@/contexts/VoiceAgentContext";
import { ForemanAvatar } from "@/components/shared/ForemanAvatar";

// Routes where the FULL draggable call card is hidden (marketing/auth/portal).
// NOTE: the bottom pill remains visible on every route while a call is live so
// the user can always end the call — see render block below.
const CARD_EXCLUDED_PATHS = ["/", "/login", "/signup", "/request-access", "/forgot-password", "/reset-password", "/portal", "/customer"];

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function SignalBars({ active }: { active: boolean }) {
  return (
    <div className="flex items-end gap-[2px] h-3">
      {[2, 4, 6, 8].map((h, i) => (
        <span
          key={i}
          className={cn(
            "w-[3px] rounded-sm bg-primary transition-opacity",
            active ? "animate-pulse" : "opacity-40"
          )}
          style={{ height: `${h * 1.5}px`, animationDelay: `${i * 120}ms` }}
        />
      ))}
    </div>
  );
}

export function ActiveCallBar() {
  const { status, isSpeaking, stopConversation } = useGlobalVoiceAgent();
  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(false);
  const [muted, setMuted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const isCardExcluded = CARD_EXCLUDED_PATHS.some((p) =>
    location.pathname === p || location.pathname.startsWith("/portal/") || location.pathname.startsWith("/customer")
  );
  const isConnected = status === "connected";

  // Tick the duration timer
  useEffect(() => {
    if (!isConnected) {
      setElapsed(0);
      return;
    }
    const startedAt = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [isConnected]);

  // Initial top-right position
  useEffect(() => {
    if (isConnected && !pos) {
      const w = Math.min(320, window.innerWidth - 32);
      setPos({ x: Math.max(8, window.innerWidth - w - 24), y: 24 });
    }
  }, [isConnected, pos]);

  // Re-clamp position when viewport changes (resize, rotation, tab visibility,
  // route change) so the card never escapes the screen and the user can always
  // see/grab it. If it ends up too close to an edge, snap it back to top-right.
  useEffect(() => {
    if (!isConnected) return;
    const reclamp = () => {
      setPos((p) => {
        const w = cardRef.current?.offsetWidth ?? 320;
        const h = cardRef.current?.offsetHeight ?? 280;
        const maxX = Math.max(8, window.innerWidth - w - 8);
        const maxY = Math.max(8, window.innerHeight - h - 8);
        // No prior position OR off-screen → snap to top-right corner.
        if (!p || p.x < 8 || p.y < 8 || p.x > window.innerWidth - 40 || p.y > window.innerHeight - 40) {
          return { x: maxX - 16, y: 24 };
        }
        return {
          x: Math.max(8, Math.min(maxX, p.x)),
          y: Math.max(8, Math.min(maxY, p.y)),
        };
      });
    };
    const onVis = () => { if (document.visibilityState === "visible") reclamp(); };
    window.addEventListener("resize", reclamp);
    window.addEventListener("orientationchange", reclamp);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("resize", reclamp);
      window.removeEventListener("orientationchange", reclamp);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [isConnected, location.pathname]);

  // Space-to-mute (matches design caption "Space to mute")
  useEffect(() => {
    if (!isConnected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" && !(e.target as HTMLElement)?.closest?.("input, textarea, [contenteditable]")) {
        e.preventDefault();
        setMuted((m) => !m);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isConnected]);

  if (!isConnected) return null;

  const onPointerDown = (e: React.PointerEvent) => {
    if (!cardRef.current || !pos) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const w = cardRef.current?.offsetWidth ?? 320;
    const h = cardRef.current?.offsetHeight ?? 280;
    const x = Math.max(8, Math.min(window.innerWidth - w - 8, dragRef.current.origX + dx));
    const y = Math.max(8, Math.min(window.innerHeight - h - 8, dragRef.current.origY + dy));
    setPos({ x, y });
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  return (
    <>
      {/* NOTE: The large floating draggable call card was removed (2026-04-27) per
          product feedback — it was too big on mobile and duplicated the bottom pill.
          The compact bottom pill below is now the SINGLE in-call control surface.
          Mute, expand-to-chat, and End Call are all reachable from it. */}

      {/* Compact bottom pill — ALWAYS visible during a call (every route) so End Call
          is reachable even if the floating card is dragged off-screen, hidden behind
          another panel, or the user navigates to a marketing/auth route mid-call.
          z-[70] keeps it above AgentTaskPanel/FloatingTomButton and the iOS URL bar. */}
      <div
        className={cn(
          "fixed z-[70] left-1/2 -translate-x-1/2",
          "flex items-center gap-2 pl-2 pr-2 py-2 rounded-full bg-card border border-border shadow-2xl",
          "max-w-[calc(100vw-1rem)]",
          "animate-fade-in"
        )}
        style={{ bottom: "max(0.75rem, calc(env(safe-area-inset-bottom, 0px) + 0.75rem))" }}
        role="status"
        aria-live="polite"
      >
        {/* Avatar with stronger pulsing live ring — unmistakable at a glance */}
        <div className="relative shrink-0">
          {isSpeaking && !muted && (
            <span className="absolute inset-0 rounded-full ring-2 ring-primary/60 animate-ping" />
          )}
          <span className={cn(
            "absolute inset-0 rounded-full ring-2",
            muted ? "ring-muted-foreground/40" : isSpeaking ? "ring-primary" : "ring-primary/50"
          )} />
          <ForemanAvatar size="sm" className="relative" />
          <span className={cn(
            "absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-card",
            muted ? "bg-muted-foreground" : isSpeaking ? "bg-primary animate-pulse" : "bg-primary/70"
          )} />
        </div>

        {/* Status label — visible on every viewport so user always knows the call is live */}
        <div className="flex flex-col leading-tight pr-1 min-w-0">
          <span className="text-xs sm:text-sm font-semibold text-foreground truncate">
            revamo AI · {muted ? "Muted" : isSpeaking ? "Speaking" : "Listening"}
          </span>
          <span className="text-[10px] sm:text-[11px] text-muted-foreground tabular-nums truncate">
            {formatDuration(elapsed)}<span className="hidden sm:inline"> · Space to mute</span>
          </span>
        </div>

        <button
          onClick={() => setMuted((m) => !m)}
          className="h-9 w-9 shrink-0 rounded-full bg-background hover:bg-muted border border-border flex items-center justify-center transition-colors"
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>
        {/* Expand-to-chat: jump to the full revamo AI screen for context/history.
            Replaces the old "expand floating card" affordance now that the card is gone. */}
        {!isCardExcluded && (
          <button
            onClick={() => navigate("/foreman-ai")}
            className="h-9 w-9 shrink-0 rounded-full bg-background hover:bg-muted border border-border flex items-center justify-center transition-colors"
            aria-label="Open revamo AI chat"
          >
            <MessageSquare className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={stopConversation}
          className="h-10 w-10 shrink-0 rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground flex items-center justify-center shadow-md active:scale-95 transition-all"
          aria-label="End call"
        >
          <PhoneOff className="h-4 w-4" />
        </button>
      </div>
    </>
  );
}
