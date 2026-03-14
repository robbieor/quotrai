import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QuoteFunnelStage } from "@/hooks/useAdvancedReports";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { ExternalLink } from "lucide-react";

interface QuoteFunnelChartProps {
  data: QuoteFunnelStage[];
  isLoading: boolean;
}

const FUNNEL_COLORS = [
  "hsl(217 91% 60%)",  // Blue - Created
  "hsl(45 93% 47%)",   // Yellow - Sent
  "hsl(142 76% 36%)",  // Green - Won
];

export function QuoteFunnelChart({ data, isLoading }: QuoteFunnelChartProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quote Pipeline</CardTitle>
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
          <CardTitle>Quote Pipeline</CardTitle>
          <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground">No quote data available</p>
        </CardContent>
      </Card>
    );
  }

  const maxCount = data[0]?.count || 1;

  return (
    <Card className="cursor-pointer group hover:border-primary/40 transition-colors" onClick={() => navigate("/quotes")}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Quote Pipeline</CardTitle>
        <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </CardHeader>
      <CardContent className="space-y-4">
        {data.map((stage, index) => {
          const widthPercent = (stage.count / maxCount) * 100;
          return (
            <div key={stage.stage} className="relative">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium">{stage.stage}</span>
                <span className="text-sm text-muted-foreground">
                  {stage.count} ({stage.percentage}%)
                </span>
              </div>
              <div className="relative h-10 bg-muted/30 rounded-lg overflow-hidden">
                <div
                  className="absolute left-0 top-0 h-full rounded-lg transition-all duration-500 flex items-center justify-center"
                  style={{
                    width: `${widthPercent}%`,
                    backgroundColor: FUNNEL_COLORS[index] || "hsl(var(--primary))",
                    minWidth: stage.count > 0 ? "60px" : "0",
                  }}
                >
                  <span className="text-white text-sm font-semibold drop-shadow-sm">
                    ${(stage.value / 1000).toFixed(0)}k
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        
        {/* Conversion metrics */}
        <div className="pt-4 border-t flex justify-between text-sm">
          <div className="text-center">
            <p className="text-lg font-bold text-primary">
              {data.length >= 2 ? Math.round((data[1].count / (data[0].count || 1)) * 100) : 0}%
            </p>
            <p className="text-xs text-muted-foreground">Send Rate</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-green-600">
              {data.length >= 3 ? Math.round((data[2].count / (data[1].count || 1)) * 100) : 0}%
            </p>
            <p className="text-xs text-muted-foreground">Win Rate</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-primary">
              {data.length >= 3 ? Math.round((data[2].count / (data[0].count || 1)) * 100) : 0}%
            </p>
            <p className="text-xs text-muted-foreground">Overall</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
