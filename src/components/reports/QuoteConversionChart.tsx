import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from "recharts";
import { QuoteConversionMetric } from "@/hooks/useReports";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { ExternalLink } from "lucide-react";

interface QuoteConversionChartProps {
  data: QuoteConversionMetric[];
  isLoading: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  "Draft": "hsl(var(--muted-foreground))",
  "Sent": "hsl(217 91% 60%)",
  "Accepted": "hsl(142 76% 36%)",
  "Declined": "hsl(0 84% 60%)",
};

const chartConfig = {
  count: {
    label: "Quotes",
    color: "hsl(var(--primary))",
  },
};

export function QuoteConversionChart({ data, isLoading }: QuoteConversionChartProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quote Conversion</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="cursor-pointer group hover:border-primary/40 transition-colors" onClick={() => navigate("/quotes")}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Quote Conversion</CardTitle>
          <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground">No quote data available</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate conversion rate
  const totalQuotes = data.reduce((sum, item) => sum + item.count, 0);
  const acceptedQuotes = data.find((item) => item.status === "Accepted")?.count || 0;
  const conversionRate = totalQuotes > 0 ? Math.round((acceptedQuotes / totalQuotes) * 100) : 0;

  return (
    <Card className="cursor-pointer group hover:border-primary/40 transition-colors" onClick={() => navigate("/quotes")}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Quote Conversion</CardTitle>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">{conversionRate}%</p>
            <p className="text-xs text-muted-foreground">Conversion Rate</p>
          </div>
          <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[260px] w-full">
          <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="status" 
              axisLine={false}
              tickLine={false}
              className="text-xs fill-muted-foreground"
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              className="text-xs fill-muted-foreground"
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name, props) => {
                    const item = props.payload as QuoteConversionMetric;
                    return [`${value} quotes ($${item.value.toLocaleString()})`, item.status];
                  }}
                />
              }
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={STATUS_COLORS[entry.status] || "hsl(var(--primary))"} 
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
