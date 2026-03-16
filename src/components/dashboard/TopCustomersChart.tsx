import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useCurrency } from "@/hooks/useCurrency";
import { useDashboardFilters } from "@/contexts/DashboardFilterContext";

interface TopCustomersChartProps {
  customers: { name: string; id: string; revenue: number; jobCount: number }[] | undefined;
}

export function TopCustomersChart({ customers }: TopCustomersChartProps) {
  const { formatCurrency, symbol } = useCurrency();
  const { setCrossFilter } = useDashboardFilters();

  if (!customers || customers.length === 0) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Top Customers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[240px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No customer data yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const data = customers.map((c) => ({
    ...c,
    shortName: c.name.length > 15 ? c.name.slice(0, 14) + "…" : c.name,
  }));

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Top Customers</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
            <XAxis
              type="number"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              tickFormatter={(v) => `${symbol}${(v / 1000).toFixed(0)}k`}
            />
            <YAxis
              type="category"
              dataKey="shortName"
              axisLine={false}
              tickLine={false}
              width={100}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
            />
            <Tooltip
              formatter={(value: number) => [formatCurrency(value), "Revenue"]}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
                fontSize: "12px",
              }}
            />
            <Bar
              dataKey="revenue"
              fill="hsl(var(--primary))"
              radius={[0, 4, 4, 0]}
              maxBarSize={28}
              cursor="pointer"
              onClick={(entry: any) => {
                setCrossFilter({ dimension: "customer", value: entry.id });
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
