import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, Sector } from "recharts";
import { useDashboardFilters } from "@/contexts/DashboardFilterContext";
import { useState, useCallback } from "react";

interface JobStatusEntry {
  status: string;
  rawStatus: string;
  count: number;
  color: string;
}

interface DashboardJobStatusChartProps {
  data?: JobStatusEntry[];
  isLoading?: boolean;
}

function renderActiveShape(props: any) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
  return (
    <g>
      <text x={cx} y={cy - 8} textAnchor="middle" fill="hsl(var(--foreground))" fontSize={18} fontWeight={600}>
        {value}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={11}>
        {payload.status}
      </text>
      <Sector
        cx={cx} cy={cy}
        innerRadius={innerRadius - 2}
        outerRadius={outerRadius + 4}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
    </g>
  );
}

export function DashboardJobStatusChart({ data, isLoading }: DashboardJobStatusChartProps) {
  const { crossFilter, setCrossFilter } = useDashboardFilters();
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  const onPieEnter = useCallback((_: any, index: number) => setActiveIndex(index), []);
  const onPieLeave = useCallback(() => setActiveIndex(undefined), []);

  if (isLoading) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-2"><Skeleton className="h-5 w-32" /></CardHeader>
        <CardContent><Skeleton className="h-[240px] w-full" /></CardContent>
      </Card>
    );
  }

  const hasData = data && data.length > 0;
  const total = data?.reduce((sum, d) => sum + d.count, 0) || 0;

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Jobs by Status</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="h-[240px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No job data yet</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="count"
                nameKey="status"
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                onMouseEnter={onPieEnter}
                onMouseLeave={onPieLeave}
                onClick={(entry: any) => {
                  setCrossFilter(
                    crossFilter?.value === entry.rawStatus
                      ? null
                      : { dimension: "jobStatus", value: entry.rawStatus }
                  );
                }}
                cursor="pointer"
              >
                {data?.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color}
                    opacity={crossFilter?.dimension === "jobStatus" && crossFilter.value !== entry.rawStatus ? 0.3 : 1}
                  />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number, name: string) => [
                  `${value} (${((value / total) * 100).toFixed(0)}%)`,
                  name
                ]}
                contentStyle={{ 
                  backgroundColor: "hsl(var(--card))", 
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                  fontSize: "12px"
                }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
