import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, Cell } from "recharts";
import { useCurrency } from "@/hooks/useCurrency";
import { useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";

export interface ScatterCustomer {
  id: string;
  name: string;
  revenue: number;
  profit: number;
  profitMargin: number;
  jobCount: number;
  avgDaysToPay: number;
  latePaymentRate: number;
}

interface Props {
  data: ScatterCustomer[] | undefined;
  isLoading?: boolean;
}

function getColor(margin: number, lateRate: number): string {
  // High late-payment rate = red regardless of margin
  if (lateRate > 60) return "hsl(0 84% 60%)";
  if (margin >= 30) return "hsl(142 71% 45%)";
  if (margin >= 15) return "hsl(38 92% 50%)";
  if (margin >= 0) return "hsl(262 83% 58%)";
  return "hsl(0 84% 60%)";
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload as ScatterCustomer;
  return (
    <div className="bg-popover border border-border rounded-md px-3 py-2 shadow-md text-xs space-y-0.5">
      <p className="font-semibold text-foreground">{d.name}</p>
      <p className="text-muted-foreground">Revenue: <span className="text-foreground tabular-nums">{d.revenue.toLocaleString(undefined, { style: "currency", currency: "GBP", maximumFractionDigits: 0 })}</span></p>
      <p className="text-muted-foreground">Profit: <span className="text-foreground tabular-nums">{d.profit.toLocaleString(undefined, { style: "currency", currency: "GBP", maximumFractionDigits: 0 })}</span></p>
      <p className="text-muted-foreground">Margin: <span className="text-foreground tabular-nums">{d.profitMargin.toFixed(0)}%</span></p>
      <p className="text-muted-foreground">Jobs: <span className="text-foreground">{d.jobCount}</span></p>
      {d.avgDaysToPay > 0 && (
        <p className="text-muted-foreground">Avg pay: <span className="text-foreground">{Math.round(d.avgDaysToPay)}d</span></p>
      )}
      {d.latePaymentRate > 0 && (
        <p className="text-muted-foreground">Late rate: <span className={d.latePaymentRate > 40 ? "text-destructive" : "text-foreground"}>{d.latePaymentRate}%</span></p>
      )}
    </div>
  );
};

export function CustomerProfitabilityScatter({ data, isLoading }: Props) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-1 px-4 pt-4">
          <CardTitle className="text-sm font-medium">Customer Profitability</CardTitle>
        </CardHeader>
        <CardContent className="h-[260px] flex items-center justify-center">
          <div className="animate-pulse text-xs text-muted-foreground">Loading…</div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-1 px-4 pt-4">
          <CardTitle className="text-sm font-medium">Customer Profitability</CardTitle>
        </CardHeader>
        <CardContent className="h-[260px] flex flex-col items-center justify-center gap-1.5">
          <CheckCircle2 className="h-5 w-5 text-primary/50" />
          <p className="text-xs text-muted-foreground text-center">
            Add job costs to unlock profitability insights
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-1 px-4 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Customer Profitability</CardTitle>
          <div className="flex items-center gap-3 text-[9px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: "hsl(142 71% 45%)" }} />High</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: "hsl(38 92% 50%)" }} />Mid</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: "hsl(0 84% 60%)" }} />Risk</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 pb-2">
        <ResponsiveContainer width="100%" height={240}>
          <ScatterChart margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="revenue"
              type="number"
              name="Revenue"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`}
              label={{ value: "Revenue", position: "insideBottom", offset: -2, fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              dataKey="profit"
              type="number"
              name="Profit"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`}
              label={{ value: "Profit", angle: -90, position: "insideLeft", offset: 10, fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            />
            <ZAxis dataKey="jobCount" range={[40, 300]} name="Jobs" />
            <RechartsTooltip content={<CustomTooltip />} />
            <Scatter
              data={data}
              onClick={(entry) => {
                if (entry?.id) navigate(`/customers?highlight=${entry.id}`);
              }}
              cursor="pointer"
            >
              {data.map((entry, idx) => (
                <Cell key={idx} fill={getColor(entry.profitMargin, entry.latePaymentRate)} fillOpacity={0.75} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
