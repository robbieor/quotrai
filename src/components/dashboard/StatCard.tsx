import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface StatCardProps {
  title: string;
  value: string;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  delay?: number;
  variant?: 'default' | 'primary' | 'success' | 'warning';
  href?: string;
}

const variantStyles = {
  default: {
    iconBg: "from-primary/20 to-primary/10",
    iconColor: "text-primary",
    accentLine: "from-primary via-primary/70 to-primary/40",
  },
  primary: {
    iconBg: "from-primary/25 to-primary/15",
    iconColor: "text-primary",
    accentLine: "from-primary via-primary/80 to-primary/50",
  },
  success: {
    iconBg: "from-emerald-500/20 to-emerald-500/10",
    iconColor: "text-emerald-600",
    accentLine: "from-emerald-500 via-emerald-500/70 to-emerald-500/40",
  },
  warning: {
    iconBg: "from-amber-500/20 to-amber-500/10",
    iconColor: "text-amber-600",
    accentLine: "from-amber-500 via-amber-500/70 to-amber-500/40",
  },
};

export function StatCard({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  trend, 
  delay = 0,
  variant = 'default',
  href
}: StatCardProps) {
  const navigate = useNavigate();
  const styles = variantStyles[variant];

  const handleClick = () => {
    if (href) {
      navigate(href);
    }
  };
  
  return (
    <Card 
      className="group relative overflow-hidden bg-card border-border/50 hover:border-primary/40 transition-all duration-500 ease-out animate-fade-up cursor-pointer hover:-translate-y-1 hover:shadow-lg"
      style={{ 
        animationDelay: `${delay}ms`,
      }}
      onClick={handleClick}
    >
      {/* Animated gradient accent line */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${styles.accentLine} opacity-80 group-hover:opacity-100 transition-all duration-500`} />
      
      {/* Subtle hover overlay */}
      <div className="absolute inset-0 bg-primary/[0.02] opacity-0 group-hover:opacity-100 transition-all duration-500" />
      
      <CardContent className="pt-6 pb-5 relative">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3 flex-1">
            <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase transition-colors duration-300 group-hover:text-foreground/80">
              {title}
            </p>
            <p className="text-4xl font-bold tracking-tight text-foreground tabular-nums transition-transform duration-300 group-hover:scale-105 origin-left">
              {value}
            </p>
            {description && (
              <p className="text-sm text-muted-foreground/80 transition-colors duration-300 group-hover:text-muted-foreground">{description}</p>
            )}
            {trend && (
              <div className={`inline-flex items-center gap-1.5 text-sm font-medium px-2 py-0.5 rounded-full transition-transform duration-300 group-hover:scale-105 ${
                trend.isPositive 
                  ? 'bg-emerald-500/10 text-emerald-600' 
                  : 'bg-red-500/10 text-red-500'
              }`}>
                <span className={`text-xs transition-transform duration-300 ${trend.isPositive ? 'rotate-0 group-hover:-translate-y-0.5' : 'rotate-180 group-hover:translate-y-0.5'}`}>
                  ▲
                </span>
                {Math.abs(trend.value)}% from last month
              </div>
            )}
          </div>
          
          {/* Icon wrapper */}
          <div className={`relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${styles.iconBg} ${styles.iconColor} transition-all duration-500 ease-out group-hover:scale-110`}>
            <Icon className="h-7 w-7 relative z-10 transition-transform duration-500 group-hover:scale-110" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
