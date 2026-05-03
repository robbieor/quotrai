import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useCurrency } from "@/hooks/useCurrency";
import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";
import { useDashboardFilters } from "@/contexts/DashboardFilterContext";
import type { JobAtRisk } from "@/hooks/useDashboardAnalytics";

interface JobsAtRiskTableProps {
  data: JobAtRisk[] | undefined;
}

const statusLabels: Record<string, string> = {
  pending: "Pending",
  scheduled: "Scheduled",
  in_progress: "In Progress",
};

export function JobsAtRiskTable({ data }: JobsAtRiskTableProps) {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const { segment } = useDashboardFilters();

  return (
    <Card className="border-border group">
      <CardHeader className="pb-1 px-4 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Jobs at Risk</CardTitle>
          <span className="text-[9px] text-muted-foreground/0 group-hover:text-muted-foreground/70 transition-colors duration-200">
            Click row to view
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-2">
        {!data || data.length === 0 ? (
          <div className="py-6 flex flex-col items-center justify-center px-4 gap-1.5">
            <CheckCircle2 className="h-5 w-5 text-primary/50" />
            <p className="text-xs text-muted-foreground text-center">
              {segment !== "all"
                ? "No stuck jobs in this focus — try a different view."
                : "No stuck jobs — all on track"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent h-8">
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Job</TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Customer</TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Stage</TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-right">Days</TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-right">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((job) => (
                <TableRow
                  key={job.id}
                  className="hover:bg-muted/30 cursor-pointer h-8"
                  onClick={() => navigate(`/jobs?highlight=${job.id}`)}
                >
                  <TableCell className="text-[11px] font-medium py-1 max-w-[120px] truncate">{job.title}</TableCell>
                  <TableCell className="text-[11px] text-muted-foreground py-1 max-w-[100px] truncate">{job.customer}</TableCell>
                  <TableCell className="py-1">
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                      {statusLabels[job.status] || job.status}
                    </Badge>
                  </TableCell>
                  <TableCell className={cn(
                    "text-[11px] text-right py-1 tabular-nums font-medium",
                    job.daysInStage > 14 ? "text-destructive" : "text-amber-500"
                  )}>
                    {job.daysInStage}d
                  </TableCell>
                  <TableCell className="text-[11px] text-right py-1 tabular-nums font-medium">
                    {formatCurrency(job.value)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
