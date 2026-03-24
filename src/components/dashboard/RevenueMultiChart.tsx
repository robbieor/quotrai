import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useCurrency } from "@/hooks/useCurrency";

interface ChartDataPoint {
  month: string;
  revenue: number;
  cash: number;
  overdue: number;
}

interface RevenueMultiChartProps {
  data: ChartDataPoint[] | undefined;
  isLoading?: boolean;
}

export function RevenueMultiChart({ data, isLoading }: RevenueMultiChartProps) {
  const { formatCurrency, symbol } = useCurrency();

  const formatAxis = (v: number) =>
    v >= 1000 ? `${symbol}${(v / 1000).toFixed(0)}k` : `${symbol}${v}`;

  if (isLoading) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-2 px-4 pt-4">
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardContent className="px-4 pb-4"><Skeleton className="h-[220px] w-full" /></CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-1 px-4 pt-4">
        <CardTitle className="text-sm font-medium">Revenue vs Cash vs Overdue</CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-3">
        {!data || data.length === 0 ? (
          <div className="h-[220px] flex items-center justify-center">
            <p className="text-xs text-muted-foreground">No data yet</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={50}
                tickFormatter={formatAxis} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))",
                  borderRadius: "6px", fontSize: "11px",
                }}
                formatter={(value: number, name: string) => [formatCurrency(value), name]}
              />
              <Legend wrapperStyle={{ fontSize: "10px" }} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.1} strokeWidth={2} />
              <Area type="monotone" dataKey="cash" name="Cash Collected" stroke="hsl(142, 71%, 45%)" fill="hsl(142, 71%, 45%)" fillOpacity={0.08} strokeWidth={2} />
              <Area type="monotone" dataKey="overdue" name="Overdue" stroke="hsl(0, 84%, 60%)" fill="hsl(0, 84%, 60%)" fillOpacity={0.08} strokeWidth={1.5} strokeDasharray="4 2" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
