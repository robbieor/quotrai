import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { MonthlyJobTrend } from "@/hooks/useAdvancedReports";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { ExternalLink } from "lucide-react";

interface JobTrendsChartProps {
  data: MonthlyJobTrend[];
  isLoading: boolean;
}

const chartConfig = {
  completed: {
    label: "Completed",
    color: "hsl(142 76% 36%)",
  },
  inProgress: {
    label: "Active",
    color: "hsl(217 91% 60%)",
  },
  cancelled: {
    label: "Cancelled",
    color: "hsl(0 84% 60%)",
  },
};

export function JobTrendsChart({ data, isLoading }: JobTrendsChartProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Job Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasData = data.some((d) => d.completed > 0 || d.inProgress > 0 || d.cancelled > 0);

  if (!hasData) {
    return (
      <Card className="cursor-pointer group hover:border-primary/40 transition-colors" onClick={() => navigate("/jobs")}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Job Trends</CardTitle>
          <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground">No job data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="cursor-pointer group hover:border-primary/40 transition-colors" onClick={() => navigate("/jobs")}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Job Trends (Stacked)</CardTitle>
        <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[260px] w-full">
          <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              dataKey="completed"
              stackId="a"
              fill="hsl(142 76% 36%)"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="inProgress"
              stackId="a"
              fill="hsl(217 91% 60%)"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="cancelled"
              stackId="a"
              fill="hsl(0 84% 60%)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
