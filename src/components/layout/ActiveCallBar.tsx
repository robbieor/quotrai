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
      {/* Floating draggable call card — hidden on marketing/auth/portal routes,
          but the bottom pill below stays visible so the call is never lost. */}
      {!collapsed && pos && !isCardExcluded && (
        <div
          ref={cardRef}
          className={cn(
            "fixed z-50 w-80 rounded-2xl bg-card border border-border shadow-2xl overflow-hidden",
            "animate-scale-in"
          )}
          style={{ left: pos.x, top: pos.y }}
        >
          {/* Header (drag handle) */}
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground cursor-grab active:cursor-grabbing select-none"
          >
            <GripVertical className="h-4 w-4 opacity-80" />
            <span className="text-xs font-bold tracking-wider uppercase flex-1">Foreman AI Call</span>
            <Wifi className="h-4 w-4 opacity-90" />
            <button
              onClick={() => setCollapsed(true)}
              className="h-7 w-7 rounded-full hover:bg-white/15 flex items-center justify-center transition-colors"
              aria-label="Collapse call"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
            <button
              onClick={stopConversation}
              className="h-7 w-7 rounded-full bg-destructive/95 hover:bg-destructive flex items-center justify-center transition-colors"
              aria-label="End call"
            >
              <PhoneOff className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 flex flex-col items-center gap-3">
            <div className="relative">
              <span className="absolute inset-0 rounded-full ring-2 ring-primary/40 animate-ping" />
              <span className="absolute inset-0 rounded-full ring-2 ring-primary/60" />
              <ForemanAvatar size="xl" className="relative" />
            </div>
            <div className="text-base font-semibold text-foreground">Foreman AI</div>
            <div className="text-3xl font-mono font-semibold tabular-nums tracking-wider text-foreground">
              {formatDuration(elapsed)}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <SignalBars active={isSpeaking && !muted} />
              <span>{muted ? "Muted" : isSpeaking ? "Speaking…" : "Listening…"}</span>
            </div>

            {/* Action row */}
            <div className="flex items-center gap-4 mt-2">
              <button
                onClick={() => setMuted((m) => !m)}
                className={cn(
                  "h-12 w-12 rounded-full flex items-center justify-center border border-border transition-all active:scale-95",
                  muted ? "bg-muted text-foreground" : "bg-background hover:bg-muted text-foreground"
                )}
                aria-label={muted ? "Unmute" : "Mute"}
              >
                {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
              <button
                onClick={stopConversation}
                className="h-14 w-14 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-lg hover:shadow-xl active:scale-95 transition-all"
                aria-label="End call"
              >
                <PhoneOff className="h-6 w-6" />
              </button>
              <button
                onClick={() => navigate("/foreman-ai")}
                className="h-12 w-12 rounded-full bg-background hover:bg-muted text-foreground flex items-center justify-center border border-border transition-all active:scale-95"
                aria-label="Open chat"
              >
                <MessageSquare className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compact bottom pill — ALWAYS visible during a call so End Call is reachable
          even if the floating card is dragged off-screen or hidden behind another panel.
          z-[60] keeps it above AgentTaskPanel/FloatingTomButton. */}
      <div
        className={cn(
          "fixed z-[60] left-1/2 -translate-x-1/2",
          "flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 pr-2 py-2 rounded-full bg-card border border-border shadow-2xl",
          "max-w-[calc(100vw-1rem)]",
          "animate-fade-in"
        )}
        style={{ bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="relative">
          <ForemanAvatar size="sm" />
          <span className={cn(
            "absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-card",
            isSpeaking && !muted ? "bg-primary animate-pulse" : "bg-muted-foreground"
          )} />
        </div>
        <div className="hidden sm:flex flex-col leading-tight pr-1 min-w-0">
          <span className="text-sm font-semibold text-foreground truncate">
            Foreman AI {muted ? "muted" : isSpeaking ? "speaking" : "listening"}
          </span>
          <span className="text-[11px] text-muted-foreground tabular-nums truncate">
            {formatDuration(elapsed)} · Space to mute
          </span>
        </div>
        {/* Mobile-only compact timer keeps the pill narrow so End Call stays on-screen */}
        <span className="sm:hidden text-xs font-mono font-semibold tabular-nums text-foreground pr-1">
          {formatDuration(elapsed)}
        </span>
        <button
          onClick={() => setMuted((m) => !m)}
          className="h-9 w-9 rounded-full bg-background hover:bg-muted border border-border flex items-center justify-center transition-colors"
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="h-9 w-9 rounded-full bg-background hover:bg-muted border border-border flex items-center justify-center transition-colors"
            aria-label="Expand call card"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={stopConversation}
          className="h-10 w-10 rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground flex items-center justify-center shadow-md active:scale-95 transition-all"
          aria-label="End call"
        >
          <PhoneOff className="h-4 w-4" />
        </button>
      </div>
    </>
  );
}
