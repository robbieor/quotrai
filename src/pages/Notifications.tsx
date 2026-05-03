import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bell, Check, CheckCheck, FileText, CreditCard, Send, Briefcase,
  Search, AlertTriangle, Clock, UserCheck, Megaphone, Trash2,
} from "lucide-react";
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
} from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const notificationIcons: Record<string, React.ElementType> = {
  quote_accepted: FileText,
  quote_declined: FileText,
  payment_received: CreditCard,
  invoice_sent: Send,
  job_created: Briefcase,
  invoice_overdue: AlertTriangle,
  lead_follow_up: Megaphone,
  trial_expiring: Clock,
  customer_created: UserCheck,
};

const notificationColors: Record<string, string> = {
  quote_accepted: "text-primary bg-primary/10 dark:bg-primary/30",
  quote_declined: "text-red-600 bg-red-100 dark:bg-red-900/30",
  payment_received: "text-primary bg-primary/10 dark:bg-primary/30",
  invoice_sent: "text-violet-600 bg-violet-100 dark:bg-violet-900/30",
  job_created: "text-blue-600 bg-blue-100 dark:bg-blue-900/30",
  invoice_overdue: "text-red-600 bg-red-100 dark:bg-red-900/30",
  lead_follow_up: "text-amber-600 bg-amber-100 dark:bg-amber-900/30",
  trial_expiring: "text-amber-600 bg-amber-100 dark:bg-amber-900/30",
  customer_created: "text-blue-600 bg-blue-100 dark:bg-blue-900/30",
};

type FilterTab = "all" | "unread" | "alerts" | "activity";

export default function Notifications() {
  const { data: notifications, isLoading } = useNotifications();
  const { data: unreadCount } = useUnreadNotificationCount();
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const alertTypes = ["invoice_overdue", "lead_follow_up", "trial_expiring", "quote_declined"];

  const filtered = (notifications || []).filter((n) => {
    const matchesSearch =
      !searchQuery ||
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.message.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    switch (activeTab) {
      case "unread":
        return !n.is_read;
      case "alerts":
        return alertTypes.includes(n.type);
      case "activity":
        return !alertTypes.includes(n.type);
      default:
        return true;
    }
  });

  const handleClick = (notification: { id: string; link: string | null; is_read: boolean }) => {
    if (!notification.is_read) {
      markAsRead.mutate(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Notifications</h1>
            {(unreadCount ?? 0) > 0 ? (
              <Badge variant="destructive" className="text-sm">
                {unreadCount} unread
              </Badge>
            ) : null}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllAsRead.mutate()}
            disabled={!unreadCount || unreadCount === 0}
            className="gap-2"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search notifications..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FilterTab)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="unread">Unread</TabsTrigger>
              <TabsTrigger value="alerts">Alerts</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-4 bg-card border border-border rounded-lg">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-72" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground">No notifications</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {activeTab === "unread"
                ? "You're all caught up!"
                : "Notifications will appear here when there's activity."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((notification) => {
              const Icon = notificationIcons[notification.type] || Bell;
              const colorClass = notificationColors[notification.type] || "text-muted-foreground bg-muted";

              return (
                <button
                  key={notification.id}
                  onClick={() => handleClick(notification)}
                  className={cn(
                    "w-full flex items-start gap-4 p-4 rounded-lg border transition-colors text-left",
                    notification.is_read
                      ? "bg-card border-border hover:bg-muted/50"
                      : "bg-accent/30 border-primary/20 hover:bg-accent/50"
                  )}
                >
                  <div
                    className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                      colorClass
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={cn("text-sm font-medium", !notification.is_read && "font-semibold")}>
                        {notification.title}
                      </p>
                      {!notification.is_read && (
                        <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {notification.link && (
                    <span className="text-xs text-primary shrink-0 mt-1">View →</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
