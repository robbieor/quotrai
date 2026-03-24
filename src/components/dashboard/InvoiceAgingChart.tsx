import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useCurrency } from "@/hooks/useCurrency";

interface InvoiceAgingChartProps {
  agingBuckets: { current: number; "1-30": number; "31-60": number; "60+": number } | undefined;
  onBucketClick?: (bucket: string) => void;
}

const BUCKET_COLORS = [
  "hsl(142, 71%, 45%)",   // current - green
  "hsl(38, 92%, 50%)",    // 1-30 - amber
  "hsl(25, 95%, 53%)",    // 31-60 - orange
  "hsl(0, 84%, 60%)",     // 60+ - red
];

const BUCKET_LABELS: Record<string, string> = {
  current: "Current",
  "1-30": "1-30 days",
  "31-60": "31-60 days",
  "60+": "60+ days",
};

export function InvoiceAgingChart({ agingBuckets, onBucketClick }: InvoiceAgingChartProps) {
  const { formatCurrency, symbol } = useCurrency();

  if (!agingBuckets) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Invoice Aging</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[240px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No invoice data yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const data = Object.entries(agingBuckets).map(([bucket, amount]) => ({
    bucket,
    label: BUCKET_LABELS[bucket] || bucket,
    amount,
  }));

  const hasData = data.some((d) => d.amount > 0);

  return (
    <Card className="border-border group">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">Invoice Aging</CardTitle>
          {onBucketClick && (
            <span className="text-[9px] text-muted-foreground/0 group-hover:text-muted-foreground/70 transition-colors duration-200">
              Click bar to drill down
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="h-[240px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No outstanding invoices</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                tickFormatter={(v) => `${symbol}${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), "Amount"]}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
              />
              <Bar
                dataKey="amount"
                radius={[4, 4, 0, 0]}
                maxBarSize={56}
                cursor={onBucketClick ? "pointer" : undefined}
                onClick={(entry) => onBucketClick?.(entry.bucket)}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={BUCKET_COLORS[i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
