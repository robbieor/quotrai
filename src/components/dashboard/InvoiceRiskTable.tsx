import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavigate } from "react-router-dom";
import { useCurrency } from "@/hooks/useCurrency";
import { Mail, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboardFilters } from "@/contexts/DashboardFilterContext";
import type { InvoiceAtRisk } from "@/hooks/useDashboardAnalytics";

interface InvoiceRiskTableProps {
  data: InvoiceAtRisk[] | undefined;
}

const riskConfig = {
  high: { label: "High", className: "bg-destructive/10 text-destructive border-destructive/20" },
  medium: { label: "Med", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  low: { label: "Low", className: "bg-muted text-muted-foreground border-border" },
};

export function InvoiceRiskTable({ data }: InvoiceRiskTableProps) {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const { segment } = useDashboardFilters();

  return (
    <Card className="border-border group">
      <CardHeader className="pb-1 px-4 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Invoice Risk</CardTitle>
          <span className="text-[9px] text-muted-foreground/0 group-hover:text-muted-foreground/70 transition-colors duration-200">
            Click row to view
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-2">
        {!data || data.length === 0 ? (
          <div className="h-[180px] flex flex-col items-center justify-center px-4 gap-1.5">
            <CheckCircle2 className="h-5 w-5 text-primary/50" />
            <p className="text-xs text-muted-foreground text-center">
              {segment !== "all"
                ? "No invoice risks in this focus — try a different view."
                : "No overdue invoices — great cash flow"}
            </p>
          </div>
        ) : (
          <TooltipProvider delayDuration={300}>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent h-8">
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Customer</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-right">Total Due</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-right">Oldest</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-right">Days</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-right">Avg Pay</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-center">Risk</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider w-[40px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((inv) => {
                  const risk = riskConfig[inv.riskScore];
                  const tooltipText = `${inv.daysOverdue}d overdue · ${inv.latePaymentRate}% late history · ${formatCurrency(inv.totalDue)} exposure`;
                  return (
                    <TableRow
                      key={inv.id}
                      className="hover:bg-muted/30 cursor-pointer h-8"
                      onClick={() => navigate(`/invoices?highlight=${inv.id}`)}
                    >
                      <TableCell className="text-[11px] font-medium py-1 max-w-[120px] truncate">{inv.customer}</TableCell>
                      <TableCell className="text-[11px] text-right py-1 tabular-nums font-medium">{formatCurrency(inv.totalDue)}</TableCell>
                      <TableCell className="text-[11px] text-right py-1 text-muted-foreground">{inv.oldestInvoice}</TableCell>
                      <TableCell className={cn(
                        "text-[11px] text-right py-1 tabular-nums font-medium",
                        inv.daysOverdue > 60 ? "text-destructive" : inv.daysOverdue > 30 ? "text-amber-500" : "text-foreground"
                      )}>
                        {inv.daysOverdue}d
                      </TableCell>
                      <TableCell className="text-[11px] text-right py-1 tabular-nums text-muted-foreground">
                        {inv.avgDaysToPay > 0 ? `${Math.round(inv.avgDaysToPay)}d` : "—"}
                      </TableCell>
                      <TableCell className="py-1 text-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 cursor-help", risk.className)}>
                              {risk.label}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="text-xs max-w-[220px]">
                            {tooltipText}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="py-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); navigate(`/invoices?highlight=${inv.id}`); }}>
                          <Mail className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TooltipProvider>
        )}
      </CardContent>
    </Card>
  );
}
