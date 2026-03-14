import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Briefcase, TrendingUp } from "lucide-react";
import { useRecentJobs } from "@/hooks/useDashboard";
import { useCurrency } from "@/hooks/useCurrency";

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  scheduled: "bg-violet-500/15 text-violet-600 border-violet-500/30",
  in_progress: "bg-primary/15 text-primary border-primary/30",
  completed: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  cancelled: "bg-destructive/15 text-destructive border-destructive/30",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function RecentJobsCard() {
  const { data: jobs, isLoading } = useRecentJobs();
  const { formatCurrency } = useCurrency();

  return (
    <Card 
      className="col-span-full lg:col-span-2 animate-fade-up relative overflow-hidden border-border/50 bg-gradient-to-br from-card via-card to-primary/5" 
      style={{ 
        animationDelay: '200ms',
        boxShadow: '0 4px 24px -4px hsl(var(--primary) / 0.08)'
      }}
    >
      {/* Accent line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-cyan-500 to-primary/50 opacity-80" />
      
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/20 to-cyan-500/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            Recent Jobs
          </CardTitle>
          <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
            Last 5 jobs
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-3 px-3 rounded-xl bg-muted/30">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32 rounded-lg" />
                  <Skeleton className="h-3 w-24 rounded-lg" />
                </div>
                <div className="flex items-center gap-4">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-4 w-16 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : jobs?.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-cyan-500/10 flex items-center justify-center mb-4">
              <Briefcase className="h-8 w-8 text-primary" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No jobs yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Jobs will appear here once created</p>
          </div>
        ) : (
          <div className="space-y-2">
            {jobs?.map((job, index) => (
              <div 
                key={job.id} 
                className="group flex items-center justify-between py-3 px-4 rounded-xl bg-gradient-to-r from-transparent via-transparent to-transparent hover:from-primary/5 hover:via-primary/3 hover:to-transparent border border-transparent hover:border-primary/20 transition-all duration-300"
                style={{ animationDelay: `${300 + index * 50}ms` }}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                    {job.title}
                  </p>
                  <p className="text-sm text-muted-foreground/70 truncate">{job.customer_name}</p>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <Badge variant="outline" className={`${statusColors[job.status] || statusColors.pending} border font-medium`}>
                    {statusLabels[job.status] || job.status}
                  </Badge>
                  <span className="font-bold text-sm w-20 text-right tabular-nums text-foreground">
                    {formatCurrency(job.estimated_value)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
