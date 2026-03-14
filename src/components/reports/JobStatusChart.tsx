import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell } from "recharts";
import { JobStatusMetric } from "@/hooks/useReports";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { ExternalLink } from "lucide-react";

interface JobStatusChartProps {
  data: JobStatusMetric[];
  isLoading: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  "Completed": "hsl(142 76% 36%)",
  "In Progress": "hsl(217 91% 60%)",
  "Scheduled": "hsl(262 83% 58%)",
  "Pending": "hsl(45 93% 47%)",
  "Cancelled": "hsl(0 84% 60%)",
};

export function JobStatusChart({ data, isLoading }: JobStatusChartProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Jobs by Status</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="cursor-pointer group hover:border-primary/40 transition-colors" onClick={() => navigate("/jobs")}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Jobs by Status</CardTitle>
          <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground">No job data available</p>
        </CardContent>
      </Card>
    );
  }

  const chartConfig = data.reduce((acc, item) => {
    acc[item.status] = {
      label: item.status,
      color: STATUS_COLORS[item.status] || "hsl(var(--muted))",
    };
    return acc;
  }, {} as Record<string, { label: string; color: string }>);

  const totalJobs = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card className="cursor-pointer group hover:border-primary/40 transition-colors" onClick={() => navigate("/jobs")}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Jobs by Status</CardTitle>
        <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => [`${value} jobs (${Math.round((Number(value) / totalJobs) * 100)}%)`, name]}
                />
              }
            />
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="count"
              nameKey="status"
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={STATUS_COLORS[entry.status] || "hsl(var(--muted))"} 
                />
              ))}
            </Pie>
            <ChartLegend content={<ChartLegendContent nameKey="status" />} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
