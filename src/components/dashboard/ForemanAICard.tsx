import { Link } from "react-router-dom";
import { Bot, ArrowRight, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import tomAvatar from "@/assets/tom-avatar.png";

export function ForemanAICard() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.04] via-card to-card shadow-premium">
      {/* Subtle glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-primary/[0.06] rounded-full blur-3xl pointer-events-none" />

      <div className="relative flex items-center gap-5 p-5 sm:p-6">
        {/* Avatar with glow ring */}
        <div className="relative shrink-0">
          <div className="absolute -inset-1.5 rounded-full bg-primary/15 blur-sm" />
          <div className="relative h-12 w-12 rounded-full overflow-hidden border-2 border-primary/25 animate-pulse-glow">
            <img src={tomAvatar} alt="Foreman AI" className="w-full h-full object-cover" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-bold text-foreground">Foreman AI</h3>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/8 px-2 py-0.5 rounded-full">
              <span className="h-1 w-1 rounded-full bg-primary animate-pulse" />
              Ready
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            "Create a quote", "Chase overdue invoices", or ask anything about your business.
          </p>
        </div>

        <Link to="/george" className="shrink-0">
          <Button size="sm" className="gap-1.5 rounded-xl shadow-sm">
            <Mic className="h-3.5 w-3.5" />
            Open
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
