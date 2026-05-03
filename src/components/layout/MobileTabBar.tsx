import { LayoutDashboard, Briefcase, CalendarDays, Bot, Clock, MoreHorizontal, type LucideIcon } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSidebar } from "@/components/ui/sidebar";
import { useUserRole } from "@/hooks/useUserRole";
import { useSeatAccess } from "@/hooks/useSeatAccess";
import { useSidebarBadges } from "@/hooks/useSidebarBadges";
import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  label: string;
  icon: LucideIcon;
  url?: string;
  action?: "more";
  badgeKey?: string;
}

export function MobileTabBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { setOpenMobile } = useSidebar();
  const { isTeamSeat } = useUserRole();
  const { canAccess } = useSeatAccess();
  const badges = useSidebarBadges();

  const aiAccessible = canAccess("connect");

  const tabs: Tab[] = isTeamSeat
    ? [
        { id: "home", label: "Home", icon: LayoutDashboard, url: "/dashboard" },
        { id: "jobs", label: "Jobs", icon: Briefcase, url: "/jobs", badgeKey: "jobs" },
        { id: "calendar", label: "Calendar", icon: CalendarDays, url: "/calendar" },
        { id: "workforce", label: "Workforce", icon: Clock, url: "/time-tracking" },
        { id: "more", label: "More", icon: MoreHorizontal, action: "more" },
      ]
    : [
        { id: "home", label: "Home", icon: LayoutDashboard, url: "/dashboard" },
        { id: "jobs", label: "Jobs", icon: Briefcase, url: "/jobs", badgeKey: "jobs" },
        { id: "calendar", label: "Calendar", icon: CalendarDays, url: "/calendar" },
        ...(aiAccessible
          ? [{ id: "ai", label: "revamo AI", icon: Bot, url: "/foreman-ai" } as Tab]
          : [{ id: "workforce", label: "Workforce", icon: Clock, url: "/time-tracking" } as Tab]),
        { id: "more", label: "More", icon: MoreHorizontal, action: "more" },
      ];

  const isActive = (url?: string) => {
    if (!url) return false;
    if (url === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(url);
  };

  return (
    <nav
      className="md:hidden fixed inset-x-0 bottom-0 z-30 bg-background border-t border-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <ul className="flex items-stretch justify-around h-12">
        {tabs.map((tab) => {
          const active = isActive(tab.url);
          const Icon = tab.icon;
          const badgeCount = tab.badgeKey ? badges[tab.badgeKey] : undefined;

          return (
            <li key={tab.id} className="flex-1">
              <button
                onClick={() => {
                  if (tab.action === "more") setOpenMobile(true);
                  else if (tab.url) navigate(tab.url);
                }}
                className={cn(
                  "relative w-full h-full flex flex-col items-center justify-center gap-0 transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
                aria-label={tab.label}
                aria-current={active ? "page" : undefined}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
                  {badgeCount && badgeCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold px-1">
                      {badgeCount > 99 ? "99+" : badgeCount}
                    </span>
                  )}
                </div>
                <span className={cn("text-[9px] leading-none mt-0.5 font-medium", active && "font-semibold")}>
                  {tab.label}
                </span>
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 bg-primary rounded-full" />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
