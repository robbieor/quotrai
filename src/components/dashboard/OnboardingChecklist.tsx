import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, ArrowRight, Sparkles, X } from "lucide-react";
import { useOnboardingChecklist } from "@/hooks/useOnboardingChecklist";
import { cn } from "@/lib/utils";
import { useState, useEffect, useCallback } from "react";
import { track } from "@/utils/analytics";

const DISMISSED_KEY = "foreman_checklist_dismissed";

export function OnboardingChecklist() {
  const { checklist, completedCount, totalCount, allComplete, progress } = useOnboardingChecklist();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISSED_KEY) === "true");

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    localStorage.setItem(DISMISSED_KEY, "true");
    track("checklist_dismissed", { completedCount, totalCount });
  }, [completedCount, totalCount]);

  useEffect(() => {
    if (allComplete) {
      track("checklist_100_percent");
    }
  }, [allComplete]);

  if (dismissed || allComplete) return null;

  return (
    <Card className="relative overflow-hidden border-primary/15 bg-gradient-to-br from-primary/[0.03] to-transparent">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-3 right-3 h-7 w-7 text-muted-foreground hover:text-foreground"
        onClick={handleDismiss}
      >
        <X className="h-4 w-4" />
      </Button>

      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          Set up your operations
          <span className="text-sm font-normal text-muted-foreground ml-auto mr-8">
            {completedCount}/{totalCount}
          </span>
        </CardTitle>
        <Progress value={progress} className="h-1.5 mt-1" />
      </CardHeader>

      <CardContent className="pt-0">
        <div className="grid gap-1.5">
          {checklist.map((item) => (
            <button
              key={item.id}
              onClick={() => !item.completed && navigate(item.route)}
              className={cn(
                "flex items-center gap-3 rounded-xl p-3 text-left transition-all duration-200",
                item.completed
                  ? "opacity-50"
                  : "hover:bg-muted/40 cursor-pointer"
              )}
            >
              {item.completed ? (
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground/50 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-medium", item.completed && "line-through text-muted-foreground")}>
                  {item.label}
                </p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
              {!item.completed && (
                <ArrowRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
              )}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
