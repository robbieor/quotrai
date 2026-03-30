import { useMemo } from "react";
import { LayoutDashboard, Briefcase, Users, Receipt, Wallet, Settings, CalendarDays, Clock, FolderOpen, LogOut, Bot, FileText, UserPlus, Package, LucideIcon } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Link } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useSeatAccess } from "@/hooks/useSeatAccess";
import { useSidebarBadges } from "@/hooks/useSidebarBadges";
import foremanLogo from "@/assets/foreman-logo.png";
import type { SeatType } from "@/hooks/useSubscriptionTier";

interface NavItem {
  id: string;
  title: string;
  url: string;
  icon: LucideIcon;
  /** Minimum seat type required; omit for all seats */
  requiredSeat?: SeatType;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "CORE",
    items: [
      { id: "dashboard", title: "Operations", url: "/dashboard", icon: LayoutDashboard },
      { id: "jobs", title: "Jobs", url: "/jobs", icon: Briefcase },
      { id: "quotes", title: "Quotes", url: "/quotes", icon: FileText },
      { id: "invoices", title: "Revenue", url: "/invoices", icon: Receipt },
      { id: "customers", title: "Clients", url: "/customers", icon: Users },
      { id: "tom", title: "Foreman AI", url: "/foreman-ai", icon: Bot, requiredSeat: "connect" },
    ],
  },
  {
    label: "MORE",
    items: [
      { id: "calendar", title: "Calendar", url: "/calendar", icon: CalendarDays },
      { id: "time-tracking", title: "Workforce", url: "/time-tracking", icon: Clock },
      { id: "expenses", title: "Expenses", url: "/expenses", icon: Wallet, requiredSeat: "connect" },
      { id: "leads", title: "Enquiries", url: "/leads", icon: UserPlus, requiredSeat: "grow" },
      { id: "templates", title: "Templates", url: "/templates", icon: FolderOpen },
      { id: "price-book", title: "Price Book", url: "/price-book", icon: Package },
    ],
  },
];

// Nav items that team-seat members (role=member) can see regardless of seat type
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
          // Team-seat members only see allowed nav items
          if (isTeamSeat && !MEMBER_ALLOWED_IDS.includes(item.id)) return false;
          // Check seat-type access
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
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <img src={foremanLogo} alt="Foreman" className="h-9 w-9 rounded-lg" />
          <span className="text-xl font-bold tracking-tight bg-primary-foreground text-secondary">Foreman</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {filteredGroups.map(group => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-foreground font-semibold">{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map(item => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === "/dashboard"}
                        className="flex items-center gap-3 rounded-full border border-muted-foreground/50 px-3 py-2 text-foreground transition-all duration-300 ease-out hover:bg-muted hover:translate-x-1 [&>svg]:transition-transform [&>svg]:duration-300"
                        activeClassName="bg-primary/20 text-foreground font-medium border-primary [&>svg]:scale-110"
                      >
                        <item.icon className="h-5 w-5" />
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

      <SidebarFooter className="border-t border-sidebar-border p-4 space-y-3">
        <Link to="/settings?tab=profile" className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-muted">
          <Avatar className="h-9 w-9 border-2 border-muted-foreground/20">
            <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || "User"} />
            <AvatarFallback className="bg-primary text-primary-foreground font-medium text-sm">
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
        
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink to="/settings" className="flex items-center gap-3 rounded-full border border-muted-foreground/50 px-3 py-2 text-foreground transition-all duration-300 ease-out hover:bg-muted hover:translate-x-1 [&>svg]:transition-transform [&>svg]:duration-300" activeClassName="bg-primary/20 text-foreground font-medium border-primary [&>svg]:scale-110">
                <Settings className="h-5 w-5" />
                <span>Settings</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <button onClick={signOut} className="flex w-full items-center gap-3 rounded-full border border-muted-foreground/50 px-3 py-2 text-foreground transition-colors hover:bg-destructive/20 hover:text-destructive">
                <LogOut className="h-5 w-5" />
                <span>Log out</span>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
