import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, CalendarDays } from "lucide-react";
import { useUpcomingSchedule, formatScheduleDate, formatScheduleTime } from "@/hooks/useDashboard";

export function UpcomingScheduleCard() {
  const { data: schedule, isLoading } = useUpcomingSchedule();

  return (
    <Card 
      className="animate-fade-up relative overflow-hidden border-border/50 bg-gradient-to-br from-card via-card to-primary/5" 
      style={{ 
        animationDelay: '250ms',
        boxShadow: '0 4px 24px -4px hsl(var(--primary) / 0.08)'
      }}
    >
      {/* Accent line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-teal-500 to-primary/50 opacity-80" />
      
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/20 to-teal-500/10 flex items-center justify-center">
              <CalendarDays className="h-4 w-4 text-primary" />
            </div>
            Upcoming Schedule
          </CardTitle>
          <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
            Next 7 days
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-start gap-3 py-3 px-3 rounded-xl bg-muted/30">
                <Skeleton className="h-11 w-11 rounded-xl" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-32 rounded-lg" />
                  <Skeleton className="h-3 w-24 rounded-lg" />
                  <Skeleton className="h-3 w-28 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : schedule?.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-teal-500/10 flex items-center justify-center mb-4">
              <Calendar className="h-8 w-8 text-primary" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No upcoming jobs scheduled</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Schedule jobs to see them here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {schedule?.map((item, index) => (
              <div 
                key={item.id} 
                className="group flex items-start gap-3 py-3 px-4 rounded-xl bg-gradient-to-r from-transparent via-transparent to-transparent hover:from-primary/5 hover:via-primary/3 hover:to-transparent border border-transparent hover:border-primary/20 transition-all duration-300"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-teal-500/10 group-hover:from-primary/25 group-hover:to-teal-500/15 transition-all duration-300">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors">
                    {item.title}
                  </p>
                  <p className="text-xs text-muted-foreground/70 truncate">{item.customer_name}</p>
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 text-primary/70" />
                    <span className="font-medium">
                      {formatScheduleDate(item.scheduled_date)} at {formatScheduleTime(item.scheduled_time)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
