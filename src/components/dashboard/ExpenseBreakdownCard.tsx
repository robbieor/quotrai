import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";
import { EXPENSE_CATEGORIES } from "@/hooks/useExpenses";
import type { ExpenseCategoryBreakdown } from "@/hooks/useDashboardAnalytics";
import { useNavigate } from "react-router-dom";

interface ExpenseBreakdownCardProps {
  data?: ExpenseCategoryBreakdown[];
  isLoading?: boolean;
  total?: number;
}

export function ExpenseBreakdownCard({ data, isLoading, total = 0 }: ExpenseBreakdownCardProps) {
  const { formatCurrency } = useCurrency();
  const navigate = useNavigate();

  return (
    <Card className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => navigate("/expenses")}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            Money Out — by Category
          </span>
          <span className="text-xs font-normal text-muted-foreground">{formatCurrency(total)}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
          </div>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No expenses logged in this period.</p>
        ) : (
          <div className="space-y-2.5">
            {data.slice(0, 6).map((c) => {
              const label = EXPENSE_CATEGORIES.find((x) => x.value === c.category)?.label || c.category;
              const pct = total > 0 ? (c.amount / total) * 100 : 0;
              return (
                <div key={c.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-foreground">{label} <span className="text-muted-foreground">· {c.count}</span></span>
                    <span className="tabular-nums font-medium">{formatCurrency(c.amount)}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary/70 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
