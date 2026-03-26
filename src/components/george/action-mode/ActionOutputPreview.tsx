import { FileText, Receipt, Briefcase, Users, DollarSign, Bell, Info, Hash, Calendar, Clock, User, StickyNote, Layers, ExternalLink } from "lucide-react";
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

// Fields shown in the financial summary row
const financialKeys = new Set(["Subtotal", "Tax", "Total", "Amount", "Est. Value"]);
// Fields shown as prominent detail chips
const detailKeys = new Set(["Customer", "Template", "Job", "Date", "Time", "Category", "Vendor", "Quote #", "Invoice #", "Items", "Notes", "Tax Rate"]);

const detailIcons: Record<string, React.ElementType> = {
  "Customer": User,
  "Template": Layers,
  "Job": Briefcase,
  "Date": Calendar,
  "Time": Clock,
  "Quote #": Hash,
  "Invoice #": Hash,
  "Items": Layers,
  "Notes": StickyNote,
};

export function ActionOutputPreview({ output, onAction }: ActionOutputPreviewProps) {
  const Icon = typeIcons[output.type] || Info;
  const data = output.preview_data || {};
  const entries = Object.entries(data);

  const customerName = data["Customer"] as string | undefined;
  const details = entries.filter(([k]) => detailKeys.has(k) && k !== "Customer");
  const financials = entries.filter(([k]) => financialKeys.has(k));
  const otherFields = entries.filter(([k]) => !detailKeys.has(k) && !financialKeys.has(k));

  const isFinancialType = output.type === "quote" || output.type === "invoice" || output.type === "expense";

  return (
    <div className="rounded-xl bg-card border-2 border-primary/20 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 p-3 pb-0">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
              {typeLabels[output.type]}
            </span>
            {output.record_number && (
              <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
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

      {/* Customer highlight */}
      {customerName && (
        <div className="mx-3 mt-2.5 flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/10">
          <User className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-xs font-medium text-foreground">{customerName}</span>
        </div>
      )}

      {/* Detail chips */}
      {details.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3 mt-2.5">
          {details.map(([key, value]) => {
            const ChipIcon = detailIcons[key];
            return (
              <div
                key={key}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted/60 text-xs"
              >
                {ChipIcon && <ChipIcon className="h-3 w-3 text-muted-foreground shrink-0" />}
                <span className="text-muted-foreground">{key}</span>
                <span className="font-medium text-foreground">{String(value)}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Other fields (fallback grid) */}
      {otherFields.length > 0 && (
        <div className="grid grid-cols-2 gap-1.5 mx-3 mt-2.5 p-2 rounded-lg bg-muted/50">
          {otherFields.map(([key, value]) => (
            <div key={key} className="text-xs">
              <span className="text-muted-foreground">{key}: </span>
              <span className="font-medium">{String(value)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Financial summary */}
      {isFinancialType && financials.length > 0 && (
        <div className="mx-3 mt-2.5 rounded-lg border border-border overflow-hidden">
          {financials.map(([key, value], idx) => {
            const isTotal = key === "Total";
            return (
              <div
                key={key}
                className={`flex items-center justify-between px-3 py-1.5 text-xs ${
                  isTotal
                    ? "bg-primary/10 font-semibold text-foreground"
                    : "bg-muted/30 text-muted-foreground"
                } ${idx > 0 ? "border-t border-border" : ""}`}
              >
                <span>{key}</span>
                <span className={isTotal ? "text-sm text-primary font-bold" : "font-medium text-foreground"}>
                  {String(value)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick actions */}
      {output.quick_actions && output.quick_actions.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 mt-2 border-t border-border">
          {output.quick_actions.map((qa) => {
            const isNavigate = qa.action.startsWith("navigate:");
            return (
              <Button
                key={qa.action}
                variant={qa.variant === "destructive" ? "destructive" : qa.variant === "outline" ? "outline" : "default"}
                size="sm"
                onClick={() => onAction?.(qa.action)}
                className="text-xs h-8"
              >
                {isNavigate && <ExternalLink className="h-3 w-3 mr-1" />}
                {qa.label}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}
