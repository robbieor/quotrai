import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useJobsDueThisWeek } from "@/hooks/useDashboardData";
import { useNavigate } from "react-router-dom";
import { format, isToday, isTomorrow } from "date-fns";
import { useCurrency } from "@/hooks/useCurrency";

export function JobsDueTable() {
  const { data, isLoading } = useJobsDueThisWeek();
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "EEE, MMM d");
  };

  if (isLoading) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Jobs Due This Week</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        {!data || data.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center px-6">
            <p className="text-sm text-muted-foreground">No jobs due this week</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-medium">Client</TableHead>
                <TableHead className="text-xs font-medium">Job</TableHead>
                <TableHead className="text-xs font-medium">Date</TableHead>
                <TableHead className="text-xs font-medium text-right">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((job) => (
                <TableRow 
                  key={job.id} 
                  className="hover:bg-muted/50 cursor-pointer"
                  onClick={() => navigate("/jobs")}
                >
                  <TableCell className="text-sm font-medium py-2">{job.client}</TableCell>
                  <TableCell className="text-sm text-muted-foreground py-2 max-w-[150px] truncate">
                    {job.job}
                  </TableCell>
                  <TableCell className="text-sm py-2">{formatDate(job.date)}</TableCell>
                  <TableCell className="text-sm text-right py-2 font-medium tabular-nums">
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
