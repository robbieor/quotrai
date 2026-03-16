import { useNavigate } from "react-router-dom";
import { X, Sparkles, Clock, Zap, TrendingUp, AlertTriangle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUpgradePrompts, UpgradePrompt } from "@/hooks/useUpgradePrompts";
import { useState } from "react";
import { useIsNative, openExternalUrl } from "@/hooks/useIsNative";

const iconMap: Record<string, typeof Sparkles> = {
  trial_expiring: Clock,
  trial_expired: AlertTriangle,
  invoice_milestone: TrendingUp,
  voice_limit: Zap,
  growth_nudge: Sparkles,
};

const styleMap: Record<string, string> = {
  high: "bg-destructive/10 border-destructive/30 text-destructive",
  medium: "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400",
  low: "bg-primary/10 border-primary/30 text-primary",
};

function SingleBanner({ prompt, onDismiss }: { prompt: UpgradePrompt; onDismiss: () => void }) {
  const navigate = useNavigate();
  const isNative = useIsNative();
  const Icon = iconMap[prompt.type] || Sparkles;

  const handleCta = () => {
    if (isNative) {
      openExternalUrl(prompt.route);
    } else {
      navigate(prompt.route);
    }
  };

  return (
    <div className={`relative rounded-lg border p-4 mb-4 ${styleMap[prompt.urgency]}`}>
      <button
        onClick={onDismiss}
        className="absolute top-2 right-2 p-1 rounded-md hover:bg-background/50 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{prompt.title}</p>
          <p className="text-sm opacity-80 mt-0.5">{prompt.message}</p>
        </div>
        <Button
          size="sm"
          variant={prompt.urgency === "high" ? "default" : "outline"}
          className="flex-shrink-0 gap-1.5"
          onClick={handleCta}
        >
          {isNative && <ExternalLink className="h-3.5 w-3.5" />}
          {prompt.cta}
        </Button>
      </div>
    </div>
  );
}

export function UpgradePromptBanner() {
  const { topPrompt } = useUpgradePrompts();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  if (!topPrompt || dismissed.has(topPrompt.type)) return null;

  // Don't dismiss high urgency prompts permanently
  const handleDismiss = () => {
    if (topPrompt.urgency !== "high") {
      setDismissed((prev) => new Set(prev).add(topPrompt.type));
    }
  };

  return <SingleBanner prompt={topPrompt} onDismiss={handleDismiss} />;
}
