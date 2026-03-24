import { useMemo } from "react";
import { useCurrency } from "@/hooks/useCurrency";
import { format, differenceInMinutes } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp, TrendingDown, Package, Clock, Receipt, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Job, JobStatus } from "@/hooks/useJobs";

interface JobDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: Job | null;
}

const statusColors: Record<JobStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  scheduled: "bg-blue-100 text-blue-800",
  in_progress: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-800",
};

function useJobPnL(jobId: string | null) {
  return useQuery({
    queryKey: ["job-pnl", jobId],
    queryFn: async () => {
      if (!jobId) return null;

      const [materialsRes, expensesRes, timeRes] = await Promise.all([
        supabase.from("job_materials").select("unit_cost, quantity").eq("job_id", jobId),
        supabase.from("expenses").select("amount").eq("job_id", jobId),
        supabase.from("time_entries").select("id, clock_in_at, clock_out_at, notes, status, clock_in_verified").eq("job_id", jobId).order("clock_in_at", { ascending: false }),
      ]);

      const materialsCost = (materialsRes.data || []).reduce(
        (sum, m) => sum + (Number(m.unit_cost) || 0) * (Number(m.quantity) || 1), 0
      );

      const expensesCost = (expensesRes.data || []).reduce(
        (sum, e) => sum + (Number(e.amount) || 0), 0
      );

      const timeEntries = timeRes.data || [];

      const laborHours = timeEntries.reduce((sum, t) => {
        if (!t.clock_in_at) return sum;
        const end = t.clock_out_at ? new Date(t.clock_out_at) : new Date();
        const ms = end.getTime() - new Date(t.clock_in_at).getTime();
        return sum + ms / 3600000;
      }, 0);

      const hourlyRate = 35;
      const laborCost = laborHours * hourlyRate;

      return {
        materialsCost,
        expensesCost,
        laborHours: Math.round(laborHours * 10) / 10,
        laborCost,
        totalCost: materialsCost + expensesCost + laborCost,
        timeEntries,
      };
    },
    enabled: !!jobId,
  });
}

export function JobDetailSheet({ open, onOpenChange, job }: JobDetailSheetProps) {
  const { data: pnl, isLoading: pnlLoading } = useJobPnL(job?.id ?? null);

  const revenue = job?.estimated_value || 0;
  const profit = revenue - (pnl?.totalCost || 0);
  const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;

  const barSegments = useMemo(() => {
    if (!pnl || revenue === 0) return [];
    const total = revenue;
    return [
      { label: "Materials", value: pnl.materialsCost, color: "bg-blue-500" },
      { label: "Labor", value: pnl.laborCost, color: "bg-amber-500" },
      { label: "Expenses", value: pnl.expensesCost, color: "bg-red-400" },
      { label: "Profit", value: Math.max(profit, 0), color: "bg-emerald-500" },
    ].filter(s => s.value > 0).map(s => ({ ...s, pct: Math.round((s.value / total) * 100) }));
  }, [pnl, revenue, profit]);

  if (!job) return null;

  const { formatCurrency: fmt } = useCurrency();

  const formatDuration = (clockIn: string, clockOut: string | null) => {
    const end = clockOut ? new Date(clockOut) : new Date();
    const minutes = differenceInMinutes(end, new Date(clockIn));
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-xl">{job.title}</SheetTitle>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={cn(statusColors[job.status], "text-xs")}>
              {job.status.replace("_", " ")}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {job.customers?.name || "No customer"}
            </span>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Job Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Scheduled</p>
              <p className="font-medium">
                {job.scheduled_date
                  ? format(new Date(job.scheduled_date), "MMM d, yyyy")
                  : "Not scheduled"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Value</p>
              <p className="font-medium">{fmt(revenue)}</p>
            </div>
          </div>

          {job.description && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Description</p>
              <p className="text-sm">{job.description}</p>
            </div>
          )}

          <Separator />

          {/* Time Tracked Section */}
          <div>
            <h3 className="font-semibold text-base mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Time Tracked
            </h3>

            {pnlLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : pnl?.timeEntries && pnl.timeEntries.length > 0 ? (
              <div className="space-y-2">
                {pnl.timeEntries.map((entry: any) => (
                  <div key={entry.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted text-sm">
                    <div>
                      <p className="font-medium">
                        {format(new Date(entry.clock_in_at), "MMM d")} · {format(new Date(entry.clock_in_at), "h:mm a")}
                        {entry.clock_out_at && ` – ${format(new Date(entry.clock_out_at), "h:mm a")}`}
                      </p>
                      {entry.notes && (
                        <p className="text-xs text-muted-foreground">{entry.notes}</p>
                      )}
                    </div>
                    <span className="font-medium">{formatDuration(entry.clock_in_at, entry.clock_out_at)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 border-t text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-semibold">{pnl.laborHours}h · {fmt(pnl.laborCost)}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No time entries recorded yet.</p>
            )}
          </div>

          <Separator />

          {/* P&L Section */}
          <div>
            <h3 className="font-semibold text-base mb-4 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Job Profitability
            </h3>

            {pnlLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                {barSegments.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex h-4 rounded-full overflow-hidden">
                      {barSegments.map((seg) => (
                        <div
                          key={seg.label}
                          className={cn(seg.color, "transition-all")}
                          style={{ width: `${seg.pct}%` }}
                          title={`${seg.label}: ${fmt(seg.value)} (${seg.pct}%)`}
                        />
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs">
                      {barSegments.map((seg) => (
                        <div key={seg.label} className="flex items-center gap-1.5">
                          <div className={cn("h-2.5 w-2.5 rounded-full", seg.color)} />
                          <span className="text-muted-foreground">{seg.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Package className="h-4 w-4" /> Materials
                    </span>
                    <span className="font-medium">{fmt(pnl?.materialsCost || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" /> Labor ({pnl?.laborHours || 0}h)
                    </span>
                    <span className="font-medium">{fmt(pnl?.laborCost || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Receipt className="h-4 w-4" /> Expenses
                    </span>
                    <span className="font-medium">{fmt(pnl?.expensesCost || 0)}</span>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Net Profit</span>
                    <div className="flex items-center gap-2">
                      {profit >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-destructive" />
                      )}
                      <span className={cn("font-bold text-lg", profit >= 0 ? "text-emerald-600" : "text-destructive")}>
                        {fmt(profit)}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {margin}%
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
