import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Bar, BarChart } from "recharts";
import { useCurrency } from "@/hooks/useCurrency";
import { useDashboardFilters } from "@/contexts/DashboardFilterContext";

interface RevenueDataPoint {
  month: string;
  revenue: number;
}

interface DashboardRevenueChartProps {
  data?: RevenueDataPoint[];
  isLoading?: boolean;
}

export function DashboardRevenueChart({ data, isLoading }: DashboardRevenueChartProps) {
  const { formatCurrency, symbol } = useCurrency();
  const { crossFilter, setCrossFilter } = useDashboardFilters();

  const formatAxis = (value: number) => {
    if (value >= 1000) return `${symbol}${(value / 1000).toFixed(0)}k`;
    return `${symbol}${value}`;
  };

  if (isLoading) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-2"><Skeleton className="h-5 w-32" /></CardHeader>
        <CardContent><Skeleton className="h-[240px] w-full" /></CardContent>
      </Card>
    );
  }

  const hasData = data && data.some((d) => d.revenue > 0);

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Revenue Trend</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="h-[240px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No revenue data yet</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis 
                dataKey="month" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                tickFormatter={formatAxis}
              />
              <Tooltip 
                formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                contentStyle={{ 
                  backgroundColor: "hsl(var(--card))", 
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                  fontSize: "12px"
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#revenueGradient)"
                activeDot={{
                  r: 6,
                  fill: "hsl(var(--primary))",
                  stroke: "hsl(var(--card))",
                  strokeWidth: 2,
                  cursor: "pointer",
                  onClick: (_: any, payload: any) => {
                    if (payload?.payload?.month) {
                      setCrossFilter(
                        crossFilter?.value === payload.payload.month
                          ? null
                          : { dimension: "month", value: payload.payload.month }
                      );
                    }
                  },
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
