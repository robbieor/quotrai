import { useCurrency } from "@/hooks/useCurrency";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import type { CatalogItem } from "@/hooks/useTeamCatalog";

interface RecentItemsProps {
  items: CatalogItem[];
}

export function RecentItems({ items }: RecentItemsProps) {
  const { formatCurrency } = useCurrency();

  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Recently Used</h3>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex-shrink-0 w-48 p-2.5 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors cursor-pointer"
          >
            <p className="text-xs font-medium truncate">{item.item_name}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] text-muted-foreground">{formatCurrency(item.sell_price)}</span>
              {item.supplier_name && (
                <Badge variant="outline" className="text-[9px] px-1 py-0">{item.supplier_name}</Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
