import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricTileProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: number;
  progress?: { current: number; goal: number; symbol?: string };
  href?: string;
  onDrillDown?: () => void;
}

export function MetricTile({ title, value, subtitle, icon: Icon, trend, progress, href, onDrillDown }: MetricTileProps) {
  const progressPercent = progress ? Math.min((progress.current / progress.goal) * 100, 100) : 0;

  const handleClick = () => {
    if (onDrillDown) onDrillDown();
  };

  return (
    <div 
      className={cn(
        "bg-card border border-border rounded-lg p-4 transition-colors",
        onDrillDown && "cursor-pointer hover:border-primary/50 hover:bg-muted/30"
      )}
      onClick={handleClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
        </div>
        {trend !== undefined && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded",
            trend > 0 ? "text-primary bg-primary/10" : trend < 0 ? "text-destructive bg-destructive/10" : "text-muted-foreground bg-muted"
          )}>
            {trend > 0 ? <TrendingUp className="h-3 w-3" /> : trend < 0 ? <TrendingDown className="h-3 w-3" /> : null}
            {trend > 0 ? "+" : ""}{trend}
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        <p className="text-2xl font-semibold text-foreground tracking-tight">{value}</p>
        
        {progress && (
          <div className="space-y-1">
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {progressPercent.toFixed(0)}% of {progress.symbol || "€"}{progress.goal.toLocaleString()} goal
            </p>
          </div>
        )}
        
        {subtitle && !progress && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
