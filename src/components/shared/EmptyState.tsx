import { Button } from "@/components/ui/button";
import { Plus, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-16 px-6 rounded-xl border border-dashed border-border/80 bg-gradient-to-b from-muted/30 to-transparent",
      className
    )}>
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-5">
        <Icon className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">{description}</p>
      <div className="flex items-center gap-3">
        {actionLabel && onAction && (
          <Button onClick={onAction} size="lg" className="gap-2">
            <Plus className="h-4 w-4" />
            {actionLabel}
          </Button>
        )}
        {secondaryActionLabel && onSecondaryAction && (
          <Button variant="outline" size="lg" onClick={onSecondaryAction}>
            {secondaryActionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
