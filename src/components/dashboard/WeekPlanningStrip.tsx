import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { startOfWeek, addDays, format, isSameDay, isToday } from "date-fns";
import { CalendarDays, HardHat } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export function WeekPlanningStrip() {
  const navigate = useNavigate();
  const { profile } = useProfile();

  const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 5 }, (_, i) => addDays(monday, i));

  const { data: jobCounts, isLoading } = useQuery({
    queryKey: ["week-planning-strip", profile?.team_id, format(monday, "yyyy-MM-dd")],
    queryFn: async () => {
      if (!profile?.team_id) return [];
      const friday = addDays(monday, 4);
      const { data } = await supabase
        .from("jobs")
        .select("scheduled_date")
        .eq("team_id", profile.team_id)
        .gte("scheduled_date", format(monday, "yyyy-MM-dd"))
        .lte("scheduled_date", format(friday, "yyyy-MM-dd"))
        .not("status", "eq", "cancelled");
      return data || [];
    },
    enabled: !!profile?.team_id,
  });

  const countsByDay = weekDays.map((day) => {
    const dateStr = format(day, "yyyy-MM-dd");
    const count = (jobCounts || []).filter((j) => j.scheduled_date === dateStr).length;
    return { day, dateStr, count };
  });

  // Rule-based AI suggestion
  const gaps = countsByDay.filter((d) => d.count === 0);
  const heavy = countsByDay.filter((d) => d.count >= 4);
  let aiLine = "";
  if (gaps.length > 0) {
    aiLine = `${format(gaps[0].day, "EEEE")} is empty — consider scheduling work.`;
  } else if (heavy.length > 0) {
    aiLine = `${format(heavy[0].day, "EEEE")} is heavy with ${heavy[0].count} jobs — watch capacity.`;
  } else {
    aiLine = "Balanced week — all days have work scheduled.";
  }

  if (isLoading) {
    return <Skeleton className="h-20 w-full rounded-lg" />;
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="grid grid-cols-5 divide-x divide-border">
        {countsByDay.map(({ day, dateStr, count }) => {
          const today = isToday(day);
          return (
            <button
              key={dateStr}
              onClick={() => navigate(`/calendar?date=${dateStr}`)}
              className={cn(
                "flex flex-col items-center gap-1 py-3 px-2 text-center transition-colors hover:bg-muted/50",
                today && "bg-primary/5"
              )}
            >
              <span className={cn("text-[10px] font-medium uppercase tracking-wider", today ? "text-primary" : "text-muted-foreground")}>
                {format(day, "EEE")}
              </span>
              <span className={cn("text-xs", today ? "font-bold text-foreground" : "text-muted-foreground")}>
                {format(day, "d MMM")}
              </span>
              <div className={cn(
                "mt-1 flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold",
                count === 0
                  ? "border-2 border-dashed border-destructive/40 text-destructive/60"
                  : count >= 4
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    : "bg-primary/10 text-primary dark:bg-primary/30 dark:text-primary"
              )}>
                {count}
              </div>
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2 px-3 py-2 border-t border-border bg-muted/30">
        <HardHat className="h-3.5 w-3.5 text-primary shrink-0" />
        <p className="text-xs text-muted-foreground truncate">{aiLine}</p>
      </div>
    </div>
  );
}
