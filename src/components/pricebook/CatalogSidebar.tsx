import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import type { CatalogFilters } from "@/hooks/useTeamCatalog";

interface CatalogSidebarProps {
  filters: CatalogFilters;
  onFiltersChange: (f: CatalogFilters) => void;
  options: {
    trade_types: string[];
    categories: string[];
    subcategories: string[];
    suppliers: string[];
  };
}

export function CatalogSidebar({ filters, onFiltersChange, options }: CatalogSidebarProps) {
  const set = (key: keyof CatalogFilters, value: any) =>
    onFiltersChange({ ...filters, [key]: value });

  return (
    <div className="space-y-6 text-sm">
      {/* Favourites */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="fav"
          checked={!!filters.favourites_only}
          onCheckedChange={(c) => set("favourites_only", !!c)}
        />
        <Label htmlFor="fav" className="flex items-center gap-1 cursor-pointer text-sm">
          <Star className="h-3.5 w-3.5 text-amber-500" /> Favourites only
        </Label>
      </div>

      {/* Trade Type */}
      {options.trade_types.length > 0 && (
        <FilterSection
          title="Trade Type"
          items={options.trade_types}
          selected={filters.trade_type}
          onSelect={(v) => set("trade_type", v === filters.trade_type ? undefined : v)}
        />
      )}

      {/* Category */}
      {options.categories.length > 0 && (
        <FilterSection
          title="Category"
          items={options.categories}
          selected={filters.category}
          onSelect={(v) => set("category", v === filters.category ? undefined : v)}
        />
      )}

      {/* Subcategory */}
      {options.subcategories.length > 0 && (
        <FilterSection
          title="Subcategory"
          items={options.subcategories}
          selected={filters.subcategory}
          onSelect={(v) => set("subcategory", v === filters.subcategory ? undefined : v)}
        />
      )}

      {/* Supplier */}
      {options.suppliers.length > 0 && (
        <FilterSection
          title="Supplier"
          items={options.suppliers}
          selected={filters.supplier_name}
          onSelect={(v) => set("supplier_name", v === filters.supplier_name ? undefined : v)}
        />
      )}
    </div>
  );
}

function FilterSection({ title, items, selected, onSelect }: {
  title: string;
  items: string[];
  selected?: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div>
      <p className="font-medium text-muted-foreground mb-2 text-xs uppercase tracking-wider">{title}</p>
      <div className="space-y-1">
        {items.map((item) => (
          <button
            key={item}
            onClick={() => onSelect(item)}
            className={`w-full text-left px-2 py-1.5 rounded-lg text-sm transition-colors ${
              selected === item
                ? "bg-primary/10 text-primary font-medium"
                : "hover:bg-muted text-foreground"
            }`}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}
