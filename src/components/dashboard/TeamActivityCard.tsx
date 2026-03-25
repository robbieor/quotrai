import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useTeamMembers } from "@/hooks/useTeam";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { Users, Briefcase, FileText, Receipt, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

interface TeamActivity {
  id: string;
  userId: string;
  userName: string;
  avatarUrl: string | null;
  action: string;
  target: string;
  timestamp: string;
  type: "job" | "invoice" | "quote" | "payment";
}

const typeConfig = {
  job: { icon: Briefcase, className: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950" },
  invoice: { icon: Receipt, className: "text-violet-600 bg-violet-50 dark:text-violet-400 dark:bg-violet-950" },
  quote: { icon: FileText, className: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950" },
  payment: { icon: CreditCard, className: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950" },
};

export function TeamActivityCard() {
  const { data: members } = useTeamMembers();

  const { data: activities, isLoading } = useQuery({
    queryKey: ["team-activity-feed"],
    queryFn: async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

      const [jobs, invoices, quotes] = await Promise.all([
        supabase.from("jobs").select("id, title, created_at").gte("created_at", sevenDaysAgo).order("created_at", { ascending: false }).limit(8),
        supabase.from("invoices").select("id, display_number, created_at").gte("created_at", sevenDaysAgo).order("created_at", { ascending: false }).limit(8),
        supabase.from("quotes").select("id, display_number, created_at").gte("created_at", sevenDaysAgo).order("created_at", { ascending: false }).limit(8),
      ]);

      const items: TeamActivity[] = [];

      (jobs.data || []).forEach(j => items.push({
        id: `j-${j.id}`, userId: "", userName: "", avatarUrl: null,
        action: "created job", target: j.title, timestamp: j.created_at, type: "job",
      }));
      (invoices.data || []).forEach((i: any) => items.push({
        id: `i-${i.id}`, userId: "", userName: "", avatarUrl: null,
        action: "created invoice", target: i.display_number, timestamp: i.created_at, type: "invoice",
      }));
      (quotes.data || []).forEach((q: any) => items.push({
        id: `q-${q.id}`, userId: "", userName: "", avatarUrl: null,
        action: "created quote", target: q.display_number, timestamp: q.created_at, type: "quote",
      }));

      return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 12);
    },
    enabled: (members?.length || 0) > 0,
  });

  if (isLoading) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
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

  const memberCount = members?.length || 0;

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">Team Activity</CardTitle>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            {memberCount} member{memberCount !== 1 ? "s" : ""}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!activities || activities.length === 0 ? (
          <div className="h-[160px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No team activity this week</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => {
              const config = typeConfig[activity.type];
              const Icon = config.icon;
              return (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className={cn("h-7 w-7 rounded-full flex items-center justify-center shrink-0", config.className)}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground leading-tight">
                      <span className="capitalize">{activity.action}</span>{" "}
                      <span className="font-medium">{activity.target}</span>
                    </p>
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
