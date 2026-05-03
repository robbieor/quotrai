import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { RevenueVsExpense } from "@/hooks/useAdvancedReports";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { ExternalLink, TrendingUp, TrendingDown } from "lucide-react";

interface RevenueExpenseChartProps {
  data: RevenueVsExpense[];
  isLoading: boolean;
}

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(142 76% 36%)",
  },
  expenses: {
    label: "Expenses",
    color: "hsl(0 84% 60%)",
  },
};

export function RevenueExpenseChart({ data, isLoading }: RevenueExpenseChartProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revenue vs Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
  const totalExpenses = data.reduce((sum, d) => sum + d.expenses, 0);
  const totalProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0;

  return (
    <Card className="cursor-pointer group hover:border-primary/40 transition-colors" onClick={() => navigate("/expenses")}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Revenue vs Expenses</CardTitle>
        <div className="flex items-center gap-3">
          <div className="text-right flex items-center gap-2">
            {totalProfit >= 0 ? (
              <TrendingUp className="h-5 w-5 text-primary" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-500" />
            )}
            <div>
              <p className={`text-xl font-bold ${totalProfit >= 0 ? "text-primary" : "text-red-600"}`}>
                {profitMargin}%
              </p>
              <p className="text-xs text-muted-foreground">Margin</p>
            </div>
          </div>
          <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[260px] w-full">
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRevenueStack" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(142 76% 36%)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="hsl(142 76% 36%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorExpenseStack" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(0 84% 60%)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="hsl(0 84% 60%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              className="text-xs fill-muted-foreground"
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              className="text-xs fill-muted-foreground"
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => [
                    `$${Number(value).toLocaleString()}`,
                    name === "revenue" ? "Revenue" : "Expenses",
                  ]}
                />
              }
            />
            <Legend
              verticalAlign="top"
              height={36}
              formatter={(value) => (
                <span className="text-xs text-muted-foreground capitalize">{value}</span>
              )}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="hsl(142 76% 36%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRevenueStack)"
            />
            <Area
              type="monotone"
              dataKey="expenses"
              stroke="hsl(0 84% 60%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorExpenseStack)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
