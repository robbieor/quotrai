import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, ArrowRight, Sparkles, X } from "lucide-react";
import { useOnboardingChecklist } from "@/hooks/useOnboardingChecklist";
import { cn } from "@/lib/utils";
import { useState, useEffect, useCallback } from "react";
import { track } from "@/utils/analytics";

const DISMISSED_KEY = "quotr_checklist_dismissed";

export function OnboardingChecklist() {
  const { checklist, completedCount, totalCount, allComplete, progress } = useOnboardingChecklist();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISSED_KEY) === "true");

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    localStorage.setItem(DISMISSED_KEY, "true");
    track("checklist_dismissed", { completedCount, totalCount });
  }, [completedCount, totalCount]);

  // Track 100% completion
  useEffect(() => {
    if (allComplete) {
      track("checklist_100_percent");
    }
  }, [allComplete]);

  // Hide if dismissed or all complete
  if (dismissed || allComplete) return null;

  return (
    <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-foreground"
        onClick={handleDismiss}
      >
        <X className="h-4 w-4" />
      </Button>

      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          Getting Started
          <span className="text-sm font-normal text-muted-foreground ml-auto mr-6">
            {completedCount}/{totalCount} complete
          </span>
        </CardTitle>
        <Progress value={progress} className="h-2" />
      </CardHeader>

      <CardContent className="pt-0">
        <div className="grid gap-2">
          {checklist.map((item) => (
            <button
              key={item.id}
              onClick={() => !item.completed && navigate(item.route)}
              className={cn(
                "flex items-center gap-3 rounded-lg p-3 text-left transition-colors",
                item.completed
                  ? "bg-muted/30 opacity-60"
                  : "hover:bg-muted/50 cursor-pointer"
              )}
            >
              {item.completed ? (
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-medium", item.completed && "line-through text-muted-foreground")}>
                  {item.label}
                </p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
              {!item.completed && (
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
