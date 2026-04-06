import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Star } from "lucide-react";
import type { CatalogFilters } from "@/hooks/useTeamCatalog";
import { getCategoriesForTrade, getSubcategoriesForCategory } from "@/data/tradeCategoryMap";

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

  // Cascading: categories depend on selected trade type
  const availableCategories = filters.trade_type
    ? getCategoriesForTrade(filters.trade_type).filter((c) => options.categories.includes(c))
    : options.categories;

  const availableSubcategories = filters.trade_type && filters.category
    ? getSubcategoriesForCategory(filters.trade_type, filters.category).filter((s) => options.subcategories.includes(s))
    : filters.category
      ? options.subcategories
      : [];

  const handleTradeSelect = (v: string) => {
    if (v === filters.trade_type) {
      onFiltersChange({ ...filters, trade_type: undefined, category: undefined, subcategory: undefined });
    } else {
      onFiltersChange({ ...filters, trade_type: v, category: undefined, subcategory: undefined });
    }
  };

  const handleCategorySelect = (v: string) => {
    if (v === filters.category) {
      onFiltersChange({ ...filters, category: undefined, subcategory: undefined });
    } else {
      onFiltersChange({ ...filters, category: v, subcategory: undefined });
    }
  };

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
          onSelect={handleTradeSelect}
        />
      )}

      {/* Category — cascaded from trade */}
      {availableCategories.length > 0 && (
        <FilterSection
          title="Category"
          items={availableCategories}
          selected={filters.category}
          onSelect={handleCategorySelect}
        />
      )}

      {/* Subcategory — cascaded from category */}
      {availableSubcategories.length > 0 && (
        <FilterSection
          title="Subcategory"
          items={availableSubcategories}
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
