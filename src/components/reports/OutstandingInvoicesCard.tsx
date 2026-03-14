import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportStats } from "@/hooks/useReports";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { ExternalLink } from "lucide-react";

interface OutstandingInvoicesCardProps {
  stats: ReportStats | undefined;
  isLoading: boolean;
}

export function OutstandingInvoicesCard({ stats, isLoading }: OutstandingInvoicesCardProps) {
  const navigate = useNavigate();

  if (isLoading || !stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Outstanding Invoices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <Skeleton className="h-10 w-32 mx-auto mb-2" />
            <Skeleton className="h-4 w-24 mx-auto" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="cursor-pointer group hover:border-primary/40 transition-colors" onClick={() => navigate("/invoices")}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Outstanding Invoices</CardTitle>
        <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="text-center">
            <p className="text-4xl font-bold">${stats.outstandingTotal.toLocaleString()}</p>
            <p className="text-muted-foreground">Total outstanding</p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-2xl font-semibold text-primary">
                ${stats.outstandingPending.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
            <div className="p-4 bg-destructive/10 rounded-lg">
              <p className="text-2xl font-semibold text-destructive">
                ${stats.outstandingOverdue.toLocaleString()}
              </p>
              <p className="text-sm text-destructive/80">Overdue</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
