import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useOverdueInvoices } from "@/hooks/useDashboardData";
import { useNavigate } from "react-router-dom";
import { Mail } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";

export function OverdueInvoicesTable() {
  const { data, isLoading } = useOverdueInvoices();
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();

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
        <CardTitle className="text-base font-medium">Overdue Invoices</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        {!data || data.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center px-6">
            <p className="text-sm text-muted-foreground">No overdue invoices</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-medium">Client</TableHead>
                <TableHead className="text-xs font-medium">Invoice #</TableHead>
                <TableHead className="text-xs font-medium text-right">Amount</TableHead>
                <TableHead className="text-xs font-medium text-right">Overdue</TableHead>
                <TableHead className="text-xs font-medium w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((invoice) => (
                <TableRow 
                  key={invoice.id} 
                  className="hover:bg-muted/50 cursor-pointer"
                  onClick={() => navigate("/invoices")}
                >
                  <TableCell className="text-sm font-medium py-2">{invoice.client}</TableCell>
                  <TableCell className="text-sm text-muted-foreground py-2">
                    {invoice.invoiceNumber}
                  </TableCell>
                  <TableCell className="text-sm text-right py-2 font-medium tabular-nums">
                    {formatCurrency(invoice.amount)}
                  </TableCell>
                  <TableCell className="text-sm text-right py-2 text-destructive font-medium">
                    {invoice.daysOverdue}d
                  </TableCell>
                  <TableCell className="py-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => navigate(`/invoices`)}
                    >
                      <Mail className="h-3.5 w-3.5" />
                    </Button>
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
