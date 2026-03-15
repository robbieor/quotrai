import { Brain, User, Briefcase, FileText, Receipt } from "lucide-react";
import type { MemoryContext } from "@/types/foreman-actions";

interface ActionMemoryBarProps {
  memory: MemoryContext;
}

export function ActionMemoryBar({ memory }: ActionMemoryBarProps) {
  const items: { icon: typeof User; label: string }[] = [];

  if (memory.current_customer) {
    items.push({ icon: User, label: memory.current_customer.name });
  }
  if (memory.current_job) {
    items.push({ icon: Briefcase, label: memory.current_job.title });
  }
  if (memory.current_quote) {
    items.push({ icon: FileText, label: `Quote ${memory.current_quote.number}` });
  }
  if (memory.current_invoice) {
    items.push({ icon: Receipt, label: `Invoice ${memory.current_invoice.number}` });
  }

  if (items.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border overflow-x-auto">
      <Brain className="h-3.5 w-3.5 text-primary shrink-0" />
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0">
        Context
      </span>
      <div className="flex items-center gap-1.5 overflow-x-auto">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/5 border border-primary/10 shrink-0"
          >
            <item.icon className="h-3 w-3 text-primary" />
            <span className="text-xs font-medium whitespace-nowrap">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
