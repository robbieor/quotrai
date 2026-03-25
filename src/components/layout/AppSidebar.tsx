import { useMemo } from "react";
import { LayoutDashboard, Briefcase, Users, Receipt, Wallet, Settings, CalendarDays, Clock, FolderOpen, LogOut, Bot, FileText, UserPlus, LucideIcon } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Link } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useSeatAccess } from "@/hooks/useSeatAccess";
import foremanLogo from "@/assets/foreman-logo.png";
import type { SeatType } from "@/hooks/useSubscriptionTier";

interface NavItem {
  id: string;
  title: string;
  url: string;
  icon: LucideIcon;
  requiredSeat?: SeatType;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "WORK",
    items: [
      { id: "dashboard", title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { id: "calendar", title: "Calendar", url: "/calendar", icon: CalendarDays },
      { id: "jobs", title: "Jobs", url: "/jobs", icon: Briefcase },
      { id: "time-tracking", title: "Time Tracking", url: "/time-tracking", icon: Clock },
    ],
  },
  {
    label: "MONEY",
    items: [
      { id: "quotes", title: "Quotes", url: "/quotes", icon: FileText },
      { id: "invoices", title: "Invoices", url: "/invoices", icon: Receipt },
      { id: "expenses", title: "Expenses", url: "/expenses", icon: Wallet, requiredSeat: "connect" },
    ],
  },
  {
    label: "PEOPLE",
    items: [
      { id: "customers", title: "Customers", url: "/customers", icon: Users },
      { id: "leads", title: "Enquiries", url: "/leads", icon: UserPlus, requiredSeat: "grow" },
    ],
  },
  {
    label: "INSIGHTS",
    items: [
      { id: "tom", title: "Foreman AI", url: "/george", icon: Bot, requiredSeat: "connect" },
      { id: "ai-activity", title: "AI Activity", url: "/ai-audit", icon: Clock, requiredSeat: "connect" },
    ],
  },
  {
    label: "MORE",
    items: [
      { id: "templates", title: "Templates", url: "/templates", icon: FolderOpen },
    ],
  },
];

const MEMBER_ALLOWED_IDS = ["jobs", "calendar", "time-tracking"];

export function AppSidebar() {
  const { profile } = useProfile();
  const { signOut } = useAuth();
  const { isTeamSeat } = useUserRole();
  const { canAccess } = useSeatAccess();

  const filteredGroups = useMemo(() => {
    return navGroups
      .map(group => ({
        ...group,
        items: group.items.filter(item => {
          if (isTeamSeat && !MEMBER_ALLOWED_IDS.includes(item.id)) return false;
          if (item.requiredSeat && !canAccess(item.requiredSeat)) return false;
          return true;
        }),
      }))
      .filter(group => group.items.length > 0);
  }, [isTeamSeat, canAccess]);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <Sidebar className="border-r border-border/40 bg-card">
      {/* Premium brand header */}
      <SidebarHeader className="p-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute -inset-1 rounded-xl bg-primary/10 blur-sm" />
            <img src={foremanLogo} alt="Foreman" className="relative h-9 w-9 rounded-xl" />
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">Foreman</span>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3">
        {filteredGroups.map(group => (
          <SidebarGroup key={group.label} className="py-1">
            <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70 px-3 mb-1">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5">
                {group.items.map(item => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === "/dashboard"}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-all duration-200 hover:bg-muted/50 hover:text-foreground"
                        activeClassName="bg-primary/8 text-foreground font-semibold shadow-sm"
                      >
                        <item.icon className="h-[18px] w-[18px]" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-border/40 p-4 space-y-2">
        <Link to="/settings?tab=profile" className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors hover:bg-muted/50">
          <Avatar className="h-9 w-9 border-2 border-border">
            <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || "User"} />
            <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-sm">
              {getInitials(profile?.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium text-foreground truncate">
              {profile?.full_name || "User"}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              {profile?.email || ""}
            </span>
          </div>
        </Link>
        
        <SidebarMenu className="space-y-0.5">
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink
                to="/settings"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-all duration-200 hover:bg-muted/50 hover:text-foreground"
                activeClassName="bg-primary/8 text-foreground font-semibold"
              >
                <Settings className="h-[18px] w-[18px]" />
                <span>Settings</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <button onClick={signOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-destructive/8 hover:text-destructive">
                <LogOut className="h-[18px] w-[18px]" />
                <span>Log out</span>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
