import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Receipt,
  Wallet,
  CalendarDays,
  Clock,
  FolderOpen,
  Bot,
  FileText,
  UserPlus,
  Package,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { useSeatAccess } from "@/hooks/useSeatAccess";
import type { SeatType } from "@/hooks/useSubscriptionTier";
import { cn } from "@/lib/utils";

interface WheelItem {
  id: string;
  title: string;
  url: string;
  icon: LucideIcon;
  requiredSeat?: SeatType;
}

const ALL_ITEMS: WheelItem[] = [
  { id: "dashboard", title: "Operations", url: "/dashboard", icon: LayoutDashboard },
  { id: "jobs", title: "Jobs", url: "/jobs", icon: Briefcase },
  { id: "quotes", title: "Quotes", url: "/quotes", icon: FileText },
  { id: "invoices", title: "Revenue", url: "/invoices", icon: Receipt },
  { id: "customers", title: "Clients", url: "/customers", icon: Users },
  { id: "tom", title: "revamo AI", url: "/foreman-ai", icon: Bot, requiredSeat: "connect" },
  { id: "calendar", title: "Calendar", url: "/calendar", icon: CalendarDays },
  { id: "time-tracking", title: "Workforce", url: "/time-tracking", icon: Clock },
  { id: "expenses", title: "Expenses", url: "/expenses", icon: Wallet, requiredSeat: "connect" },
  { id: "leads", title: "Enquiries", url: "/leads", icon: UserPlus, requiredSeat: "grow" },
  { id: "templates", title: "Templates", url: "/templates", icon: FolderOpen },
  { id: "price-book", title: "Price Book", url: "/price-book", icon: Package },
  { id: "automations", title: "Automations", url: "/automations", icon: Zap, requiredSeat: "connect" },
];

const MEMBER_ALLOWED_IDS = ["jobs", "calendar", "time-tracking"];

// Wheel geometry
const RADIUS = 150; // px from center to icon
const CENTER_OFFSET_Y = 130; // how far below the visible bottom edge the center sits

export function MobileNavWheel() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isTeamSeat } = useUserRole();
  const { canAccess } = useSeatAccess();

  const items = useMemo(
    () =>
      ALL_ITEMS.filter((it) => {
        if (isTeamSeat && !MEMBER_ALLOWED_IDS.includes(it.id)) return false;
        if (it.requiredSeat && !canAccess(it.requiredSeat)) return false;
        return true;
      }),
    [isTeamSeat, canAccess],
  );

  const step = items.length > 0 ? 360 / items.length : 0;
  // rotation: degrees applied to wheel. Item i sits at base angle (i*step) + rotation,
  // measured from top (12 o'clock), positive = clockwise.
  // Focus is the item whose final angle is closest to 0deg.
  const [rotation, setRotation] = useState(0);
  const dragging = useRef<{ startX: number; startRot: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync wheel to active route on route change
  useEffect(() => {
    const idx = items.findIndex((it) =>
      it.url === "/dashboard"
        ? location.pathname === "/dashboard"
        : location.pathname.startsWith(it.url),
    );
    if (idx >= 0) {
      // We want item idx at angle 0 → rotation = -idx * step
      setRotation(-idx * step);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, items.length]);

  const focusedIndex = useMemo(() => {
    if (items.length === 0) return 0;
    // angle of item i = i*step + rotation, normalize to [-180, 180]
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < items.length; i++) {
      let a = (i * step + rotation) % 360;
      if (a > 180) a -= 360;
      if (a < -180) a += 360;
      const d = Math.abs(a);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    return best;
  }, [items, rotation, step]);

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = { startX: e.clientX, startRot: rotation };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - dragging.current.startX;
    // Anti-clockwise on left swipe: dx < 0 → rotation decreases (more negative)
    // 1 step per ~80px swipe
    const delta = (dx / 80) * step;
    setRotation(dragging.current.startRot + delta);
  };
  const onPointerUp = () => {
    if (!dragging.current) return;
    dragging.current = null;
    // Snap to nearest item
    const snapped = Math.round(rotation / step) * step;
    setRotation(snapped);
  };

  const handleItemClick = (i: number) => {
    if (i === focusedIndex) {
      navigate(items[i].url);
    } else {
      // Rotate so item i becomes focused (angle 0)
      // Choose the rotation closest to current
      const target = -i * step;
      let diff = target - rotation;
      // normalize to nearest
      while (diff > 180) diff -= 360;
      while (diff < -180) diff += 360;
      setRotation(rotation + diff);
    }
  };

  if (items.length === 0) return null;

  const focused = items[focusedIndex];

  return (
    <div className="md:hidden fixed inset-x-0 bottom-0 z-30 pointer-events-none select-none">
      {/* Active label */}
      <div className="flex justify-center pointer-events-none">
        <div className="mb-2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-lg">
          {focused.title}
        </div>
      </div>

      <div
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative pointer-events-auto mx-auto"
        style={{
          width: RADIUS * 2 + 80,
          height: RADIUS + 60,
          touchAction: "pan-y",
        }}
      >
        {/* Wheel disc background */}
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-full bg-sidebar/95 backdrop-blur-md border border-sidebar-border shadow-2xl"
          style={{
            width: RADIUS * 2 + 40,
            height: RADIUS * 2 + 40,
            top: -CENTER_OFFSET_Y - 20,
          }}
        />
        {/* Focus indicator (chevron at top) */}
        <div
          className="absolute left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary shadow-md"
          style={{ top: -CENTER_OFFSET_Y - RADIUS - 26 }}
        />

        {items.map((item, i) => {
          let angle = (i * step + rotation) % 360;
          if (angle > 180) angle -= 360;
          if (angle < -180) angle += 360;
          const rad = (angle * Math.PI) / 180;
          // Center-X: middle of container; Y: relative to "wheel center" which is below screen
          const x = Math.sin(rad) * RADIUS;
          const y = -Math.cos(rad) * RADIUS; // negative = upward
          const dist = Math.abs(angle);
          const isFocused = i === focusedIndex;
          const opacity = Math.max(0.25, 1 - dist / 110);
          const scale = isFocused ? 1.15 : Math.max(0.7, 1 - dist / 200);
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(i)}
              className={cn(
                "absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-full transition-all duration-300 ease-out",
                isFocused
                  ? "bg-primary text-primary-foreground shadow-lg ring-2 ring-primary/40"
                  : "bg-white/5 text-white/70 hover:bg-white/10 border border-white/10",
              )}
              style={{
                width: 48,
                height: 48,
                transform: `translate(calc(-50% + ${x}px), calc(${-CENTER_OFFSET_Y + y}px))`,
                opacity,
                zIndex: isFocused ? 10 : 5 - Math.floor(dist / 30),
              }}
              aria-label={item.title}
            >
              <Icon
                className="h-5 w-5"
                style={{ transform: `scale(${scale})` }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
