import { useState } from "react";
import { Sparkles, Check, X, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type RewriteTone = "professional" | "friendly" | "firm" | "apologetic";
export type RewriteContext =
  | "quote_followup"
  | "overdue_chase"
  | "new_lead_reply"
  | "customer_note"
  | "job_description"
  | "generic";

const TONE_LABELS: Record<RewriteTone, string> = {
  professional: "Professional",
  friendly: "Friendly",
  firm: "Firm",
  apologetic: "Apologetic",
};

interface RewriteButtonProps {
  /** Current text in the field. */
  value: string;
  /** Called when the user accepts a rewrite. */
  onAccept: (rewritten: string) => void;
  /** Hint to the AI about what kind of message this is. */
  context?: RewriteContext;
  /** Compact icon-only button (default) vs. full label button. */
  variant?: "icon" | "full";
  className?: string;
  disabled?: boolean;
}

export function RewriteButton({
  value,
  onAccept,
  context = "generic",
  variant = "icon",
  className,
  disabled,
}: RewriteButtonProps) {
  const [tone, setTone] = useState<RewriteTone>("professional");
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [rewritten, setRewritten] = useState("");

  const runRewrite = async (chosenTone: RewriteTone) => {
    if (!value.trim()) {
      toast.error("Nothing to rewrite — type something first.");
      return;
    }
    setTone(chosenTone);
    setIsLoading(true);
    setOpen(true);
    setRewritten("");
    try {
      const { data, error } = await supabase.functions.invoke("foreman-rewrite", {
        body: { text: value, tone: chosenTone, context },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setRewritten(data?.rewritten ?? "");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Rewrite failed";
      toast.error(msg);
      setOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = () => {
    if (rewritten) onAccept(rewritten);
    setOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size={variant === "icon" ? "icon" : "sm"}
            disabled={disabled || !value.trim()}
            className={cn(
              "text-primary hover:text-primary hover:bg-primary/10",
              className
            )}
            title="Rewrite with revamo AI"
          >
            <Sparkles className={cn("h-4 w-4", variant === "full" && "mr-2")} />
            {variant === "full" && <span>Rewrite</span>}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Rewrite tone</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {(Object.keys(TONE_LABELS) as RewriteTone[]).map((t) => (
            <DropdownMenuItem key={t} onClick={() => runRewrite(t)}>
              {TONE_LABELS[t]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Rewrite — {TONE_LABELS[tone]}
            </DialogTitle>
            <DialogDescription>
              Review the suggestion. Original is preserved until you accept.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <div className="text-xs font-medium text-muted-foreground mb-1">Original</div>
              <p className="whitespace-pre-wrap text-foreground/80">{value}</p>
            </div>
            <div className="rounded-md border border-primary/40 bg-primary/5 p-3 text-sm min-h-[80px]">
              <div className="text-xs font-medium text-primary mb-1 flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Rewritten
              </div>
              {isLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> George is polishing it…
                </div>
              ) : (
                <p className="whitespace-pre-wrap text-foreground">{rewritten}</p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="sm" disabled={isLoading}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Try another tone
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {(Object.keys(TONE_LABELS) as RewriteTone[]).map((t) => (
                  <DropdownMenuItem key={t} onClick={() => runRewrite(t)}>
                    {TONE_LABELS[t]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isLoading}>
                <X className="h-4 w-4 mr-2" />
                Discard
              </Button>
              <Button type="button" onClick={handleAccept} disabled={isLoading || !rewritten}>
                <Check className="h-4 w-4 mr-2" />
                Use this
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
