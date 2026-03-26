import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sun, Briefcase, Clock, Receipt, ArrowRight, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { useCurrency } from "@/hooks/useCurrency";

export function EndOfDaySummary() {
  const { profile } = useProfile();
  const { formatCurrency } = useCurrency();
  const [expanded, setExpanded] = useState(true);

  const now = new Date();
  const hour = now.getHours();
  const isAfter5pm = hour >= 17;

  const { data: summary, isLoading } = useQuery({
    queryKey: ["end-of-day-summary", profile?.team_id, format(now, "yyyy-MM-dd")],
    queryFn: async () => {
      if (!profile?.team_id) return null;
      const today = format(now, "yyyy-MM-dd");

      // Fetch today's completed jobs
      const { data: completedJobs } = await supabase
        .from("jobs")
        .select("id, title")
        .eq("team_id", profile.team_id)
        .eq("status", "completed")
        .gte("updated_at", `${today}T00:00:00`)
        .lte("updated_at", `${today}T23:59:59`);

      // Fetch today's invoices sent
      const { data: invoicesSent } = await supabase
        .from("invoices")
        .select("id, total")
        .eq("team_id", profile.team_id)
        .gte("created_at", `${today}T00:00:00`)
        .lte("created_at", `${today}T23:59:59`);

      // Fetch today's payments
      const { data: payments } = await supabase
        .from("payments")
        .select("id, amount")
        .eq("team_id", profile.team_id)
        .gte("payment_date", today)
        .lte("payment_date", today);

      // Fetch tomorrow's schedule
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = format(tomorrow, "yyyy-MM-dd");
      const { data: tomorrowJobs } = await supabase
        .from("jobs")
        .select("id, title, scheduled_time")
        .eq("team_id", profile.team_id)
        .eq("scheduled_date", tomorrowStr)
        .in("status", ["scheduled", "pending"]);

      const totalInvoiced = (invoicesSent || []).reduce((s, i) => s + (i.total || 0), 0);
      const totalPayments = (payments || []).reduce((s, p) => s + (p.amount || 0), 0);

      return {
        completedJobs: completedJobs || [],
        invoicesSent: invoicesSent || [],
        payments: payments || [],
        tomorrowJobs: tomorrowJobs || [],
        totalInvoiced,
        totalPayments,
      };
    },
    enabled: !!profile?.team_id,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading || !summary) return null;

  const hasActivity = summary.completedJobs.length > 0 || summary.invoicesSent.length > 0 || summary.payments.length > 0;
  if (!hasActivity && summary.tomorrowJobs.length === 0) return null;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sun className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-semibold">Today's Wrap-Up</CardTitle>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-3 pt-0">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-2 rounded-lg bg-background/80">
              <Briefcase className="h-4 w-4 mx-auto text-primary mb-1" />
              <p className="text-lg font-bold">{summary.completedJobs.length}</p>
              <p className="text-[10px] text-muted-foreground">Jobs Done</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-background/80">
              <Receipt className="h-4 w-4 mx-auto text-primary mb-1" />
              <p className="text-lg font-bold">{formatCurrency(summary.totalInvoiced)}</p>
              <p className="text-[10px] text-muted-foreground">Invoiced</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-background/80">
              <Receipt className="h-4 w-4 mx-auto text-primary mb-1" />
              <p className="text-lg font-bold text-primary">{formatCurrency(summary.totalPayments)}</p>
              <p className="text-[10px] text-muted-foreground">Received</p>
            </div>
          </div>

          {/* Tomorrow's preview */}
          {summary.tomorrowJobs.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <ArrowRight className="h-3 w-3" /> Tomorrow — {summary.tomorrowJobs.length} job{summary.tomorrowJobs.length > 1 ? "s" : ""}
                </p>
                <div className="space-y-1">
                  {summary.tomorrowJobs.slice(0, 3).map((job) => (
                    <div key={job.id} className="flex items-center gap-2 text-xs">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">{job.scheduled_time || "TBC"}</span>
                      <span className="truncate">{job.title}</span>
                    </div>
                  ))}
                  {summary.tomorrowJobs.length > 3 && (
                    <p className="text-[10px] text-muted-foreground">+{summary.tomorrowJobs.length - 3} more</p>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}
