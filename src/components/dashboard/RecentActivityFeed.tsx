import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecentActivity } from "@/hooks/useDashboardData";
import { formatDistanceToNow } from "date-fns";
import { Briefcase, FileText, CreditCard, Send } from "lucide-react";
import { cn } from "@/lib/utils";

const activityIcons = {
  job_created: Briefcase,
  invoice_sent: FileText,
  payment_received: CreditCard,
  quote_sent: Send,
};

const activityColors = {
  job_created: "text-blue-600 bg-blue-50",
  invoice_sent: "text-violet-600 bg-violet-50",
  payment_received: "text-primary bg-primary/10",
  quote_sent: "text-amber-600 bg-amber-50",
};

export function RecentActivityFeed() {
  const { data, isLoading } = useRecentActivity();

  if (isLoading) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {!data || data.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.map((activity) => {
              const Icon = activityIcons[activity.type];
              const colorClass = activityColors[activity.type];
              
              return (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0", colorClass)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground leading-tight">{activity.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
