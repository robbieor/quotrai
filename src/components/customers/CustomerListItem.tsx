import { ChevronRight } from "lucide-react";
import type { Customer } from "@/hooks/useCustomers";

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");
}

function nameToHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

interface CustomerListItemProps {
  customer: Customer;
  onClick: (customer: Customer) => void;
  isLast?: boolean;
}

export function CustomerListItem({ customer, onClick, isLast }: CustomerListItemProps) {
  const initials = getInitials(customer.name);
  const hue = nameToHue(customer.name);

  return (
    <button
      type="button"
      className="w-full flex items-center gap-3 px-5 py-3 text-left active:bg-muted/60 transition-colors"
      style={{ minHeight: 72 }}
      onClick={() => onClick(customer)}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-semibold shrink-0"
        style={{
          backgroundColor: `hsl(${hue}, 55%, 90%)`,
          color: `hsl(${hue}, 45%, 35%)`,
        }}
      >
        {initials}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[16px] font-semibold text-foreground truncate leading-tight">
          {customer.name}
        </p>
        {customer.email && (
          <p className="text-[13px] text-muted-foreground truncate leading-tight mt-0.5">
            {customer.email}
          </p>
        )}
      </div>

      <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />

      {!isLast && (
        <div className="absolute bottom-0 right-0 left-[72px] h-px bg-border/50" />
      )}
    </button>
  );
}
