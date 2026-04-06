import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Pencil, Trash2 } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";
import type { CatalogItem } from "@/hooks/useTeamCatalog";

interface CatalogProductCardProps {
  item: CatalogItem;
  onEdit: (item: CatalogItem) => void;
  onDelete: (id: string) => void;
  onToggleFav: (id: string, fav: boolean) => void;
}

export function CatalogProductCard({ item, onEdit, onDelete, onToggleFav }: CatalogProductCardProps) {
  const { formatCurrency } = useCurrency();
  const margin = item.sell_price > 0
    ? (((item.sell_price - item.cost_price) / item.sell_price) * 100).toFixed(1)
    : null;

  return (
    <div className="group flex items-start gap-3 p-3 sm:p-4 rounded-xl border border-border bg-card hover:border-primary/20 transition-colors">
      {/* Image or placeholder */}
      {item.image_url ? (
        <img src={item.image_url} alt="" className="w-14 h-14 rounded-lg object-contain bg-muted flex-shrink-0" />
      ) : (
        <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
          <span className="text-muted-foreground text-xs">No img</span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{item.item_name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {[item.supplier_name, item.supplier_sku, item.manufacturer].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onToggleFav(item.id, !item.is_favourite)}>
              <Star className={`h-3.5 w-3.5 ${item.is_favourite ? "fill-amber-500 text-amber-500" : "text-muted-foreground"}`} />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(item)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(item.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Pricing row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs">
          {item.website_price != null && item.website_price > 0 && (
            <span className="text-muted-foreground">
              Web: {formatCurrency(item.website_price)}
            </span>
          )}
          {item.discount_percent > 0 && (
            <span className="text-muted-foreground">
              Disc: {item.discount_percent}%
            </span>
          )}
          <span>Cost: <span className="font-medium">{formatCurrency(item.cost_price)}</span></span>
          <span>Sell: <span className="font-semibold">{formatCurrency(item.sell_price)}</span></span>
          {margin && (
            <Badge variant={parseFloat(margin) >= 20 ? "default" : "destructive"} className="text-[10px] px-1.5">
              {margin}%
            </Badge>
          )}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mt-1.5">
          {item.category && <Badge variant="secondary" className="text-[10px]">{item.category}</Badge>}
          {item.subcategory && <Badge variant="outline" className="text-[10px]">{item.subcategory}</Badge>}
          {item.unit !== "each" && <Badge variant="outline" className="text-[10px]">per {item.unit}</Badge>}
        </div>
      </div>
    </div>
  );
}
