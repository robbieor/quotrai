import { useState, useEffect, useMemo } from "react";
import { LayoutDashboard, Briefcase, Users, FileText, Receipt, Wallet, BarChart3, Settings, CalendarDays, Clock, FolderOpen, LogOut, Bot, FileCheck, LucideIcon, Megaphone } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { NavLink } from "@/components/NavLink";
import { Link } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole, TEAM_SEAT_NAV_IDS } from "@/hooks/useUserRole";
import { DraggableNavItem } from "./DraggableNavItem";
import quotrLogo from "@/assets/quotr-logo.png";
interface NavItem {
  id: string;
  title: string;
  url: string;
  icon: LucideIcon;
}
const defaultNavItems: NavItem[] = [{
  id: "dashboard",
  title: "Dashboard",
  url: "/dashboard",
  icon: LayoutDashboard
}, {
  id: "leads",
  title: "Leads",
  url: "/leads",
  icon: Megaphone
}, {
  id: "jobs",
  title: "Jobs",
  url: "/jobs",
  icon: Briefcase
}, {
  id: "calendar",
  title: "Calendar",
  url: "/calendar",
  icon: CalendarDays
}, {
  id: "time-tracking",
  title: "Time Tracking",
  url: "/time-tracking",
  icon: Clock
}, {
  id: "customers",
  title: "Customers",
  url: "/customers",
  icon: Users
}, {
  id: "quotes",
  title: "Quotes",
  url: "/quotes",
  icon: FileText
}, {
  id: "invoices",
  title: "Invoices",
  url: "/invoices",
  icon: Receipt
}, {
  id: "documents",
  title: "Templates",
  url: "/documents",
  icon: FolderOpen
}, {
  id: "expenses",
  title: "Expenses",
  url: "/expenses",
  icon: Wallet
}, {
  id: "reports",
  title: "Reports",
  url: "/reports",
  icon: BarChart3
}, {
  id: "tom",
  title: "Foreman AI",
  url: "/george",
  icon: Bot
}];
const STORAGE_KEY = "quotr-nav-order";
export function AppSidebar() {
  const {
    profile
  } = useProfile();
  const {
    signOut
  } = useAuth();
  const { isTeamSeat } = useUserRole();
  const [navItems, setNavItems] = useState<NavItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const savedOrder = JSON.parse(saved) as string[];
        const orderedItems = savedOrder.map(id => defaultNavItems.find(item => item.id === id)).filter((item): item is NavItem => item !== undefined);
        // Add any new items that weren't in saved order
        const newItems = defaultNavItems.filter(item => !savedOrder.includes(item.id));
        return [...orderedItems, ...newItems];
      } catch {
        return defaultNavItems;
      }
    }
    return defaultNavItems;
  });

  // Filter nav items for Team Seat (member) users
  const filteredNavItems = useMemo(() => {
    if (!isTeamSeat) return navItems;
    return navItems.filter(item => TEAM_SEAT_NAV_IDS.includes(item.id));
  }, [navItems, isTeamSeat]);

  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8
    }
  }), useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates
  }));
  const handleDragEnd = (event: DragEndEvent) => {
    const {
      active,
      over
    } = event;
    if (over && active.id !== over.id) {
      setNavItems(items => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newOrder.map(item => item.id)));
        return newOrder;
      });
    }
  };
  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };
  return <Sidebar className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <img src={quotrLogo} alt="Quotr" className="h-9 w-9 rounded-lg" />
          <span className="text-xl font-bold tracking-tight bg-primary-foreground text-secondary">Quotr</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-foreground font-semibold">Main Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={filteredNavItems.map(item => item.id)} strategy={verticalListSortingStrategy}>
                <SidebarMenu>
                  {filteredNavItems.map(item => <DraggableNavItem key={item.id} id={item.id} title={item.title} url={item.url} icon={item.icon} />)}
                </SidebarMenu>
              </SortableContext>
            </DndContext>
          </SidebarGroupContent>
        </SidebarGroup>
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
    </Sidebar>;
}