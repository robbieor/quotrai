import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { useCurrency } from "@/hooks/useCurrency";
import type { CustomerProfitData } from "@/hooks/useDashboardAnalytics";

interface TopCustomersTableProps {
  data: CustomerProfitData[] | undefined;
}

export function TopCustomersTable({ data }: TopCustomersTableProps) {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();

  return (
    <Card className="border-border">
      <CardHeader className="pb-1 px-4 pt-4">
        <CardTitle className="text-sm font-medium">Top Customers by Revenue</CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-2">
        {!data || data.length === 0 ? (
          <div className="h-[180px] flex items-center justify-center px-4">
            <p className="text-xs text-muted-foreground">No customer data yet</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent h-8">
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider w-[30px]">#</TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Customer</TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-right">Revenue</TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-right">Jobs</TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-right">Invoices</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((customer, idx) => (
                <TableRow
                  key={customer.id}
                  className="hover:bg-muted/30 cursor-pointer h-8"
                  onClick={() => navigate(`/customers?highlight=${customer.id}`)}
                >
                  <TableCell className="text-[11px] text-muted-foreground py-1 tabular-nums">{idx + 1}</TableCell>
                  <TableCell className="text-[11px] font-medium py-1 max-w-[150px] truncate">{customer.name}</TableCell>
                  <TableCell className="text-[11px] text-right py-1 tabular-nums font-medium">{formatCurrency(customer.revenue)}</TableCell>
                  <TableCell className="text-[11px] text-right py-1 tabular-nums text-muted-foreground">{customer.jobCount}</TableCell>
                  <TableCell className="text-[11px] text-right py-1 tabular-nums text-muted-foreground">{customer.invoiceCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
