import { FileText, Receipt, Briefcase, Users, DollarSign, Bell, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ActionOutput } from "@/types/foreman-actions";

interface ActionOutputPreviewProps {
  output: ActionOutput;
  onAction?: (action: string) => void;
}

const typeIcons = {
  quote: FileText,
  invoice: Receipt,
  job: Briefcase,
  client: Users,
  expense: DollarSign,
  reminder: Bell,
  info: Info,
  text: Info,
};

const typeLabels = {
  quote: "Quote",
  invoice: "Invoice",
  job: "Job",
  client: "Client",
  expense: "Expense",
  reminder: "Reminder",
  info: "Info",
  text: "Response",
};

export function ActionOutputPreview({ output, onAction }: ActionOutputPreviewProps) {
  const Icon = typeIcons[output.type] || Info;

  return (
    <div className="p-3 rounded-xl bg-card border-2 border-primary/20 shadow-sm">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
              {typeLabels[output.type]}
            </span>
            {output.record_number && (
              <span className="text-[10px] text-muted-foreground font-mono">
                {output.record_number}
              </span>
            )}
          </div>
          <h4 className="text-sm font-semibold mt-0.5">{output.title}</h4>
          {output.summary && (
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{output.summary}</p>
          )}
        </div>
      </div>

      {/* Preview data fields */}
      {output.preview_data && Object.keys(output.preview_data).length > 0 && (
        <div className="grid grid-cols-2 gap-1.5 mb-3 p-2 rounded-lg bg-muted/50">
          {Object.entries(output.preview_data).map(([key, value]) => (
            <div key={key} className="text-xs">
              <span className="text-muted-foreground">{key}: </span>
              <span className="font-medium">{String(value)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Quick actions */}
      {output.quick_actions && output.quick_actions.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
          {output.quick_actions.map((qa) => (
            <Button
              key={qa.action}
              variant={qa.variant === "destructive" ? "destructive" : qa.variant === "outline" ? "outline" : "default"}
              size="sm"
              onClick={() => onAction?.(qa.action)}
              className="text-xs h-8"
            >
              {qa.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
