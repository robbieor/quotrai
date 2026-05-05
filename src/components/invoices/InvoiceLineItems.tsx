import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Eye, EyeOff } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrencyValue, DEFAULT_CURRENCY } from "@/utils/currencyUtils";
import { getAllowedRates, getDefaultLineRate, getTaxName, hasVatConfig } from "@/utils/vatRates";
import type { LineGroup } from "@/types/pricingDisplay";
import { LINE_GROUPS } from "@/types/pricingDisplay";
import { cn } from "@/lib/utils";

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_group?: string;
  visible?: boolean;
  tax_rate?: number;
}

interface InvoiceLineItemsProps {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
  currencyCode?: string;
  /** ISO-2 country code used to drive the VAT/Tax dropdown options. */
  country?: string | null;
}

export function InvoiceLineItems({ items, onChange, currencyCode = DEFAULT_CURRENCY, country }: InvoiceLineItemsProps) {
  const taxName = getTaxName(country);
  const showTaxColumn = hasVatConfig(country);

  const addItem = () => {
    const newGroup = "Materials";
    onChange([
      ...items,
      {
        id: crypto.randomUUID(),
        description: "",
        quantity: 1,
        unit_price: 0,
        line_group: newGroup,
        visible: true,
        tax_rate: getDefaultLineRate(country, newGroup),
      },
    ]);
  };

  const removeItem = (id: string) => {
    onChange(items.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, field: keyof LineItem, value: string | number | boolean) => {
    onChange(
      items.map((item) => {
        if (item.id !== id) return item;
        const next = { ...item, [field]: value } as LineItem;
        if (field === "line_group" && typeof value === "string") {
          const allowed = getAllowedRates(country, value);
          if (item.tax_rate === undefined || allowed.includes(item.tax_rate)) {
            next.tax_rate = getDefaultLineRate(country, value);
          }
        }
        return next;
      })
    );
  };

  const formatCurrency = (value: number) => {
    return formatCurrencyValue(value, currencyCode);
  };

  const gridCols = showTaxColumn
    ? "grid-cols-[1fr_70px_80px_80px_80px_70px_32px_32px]"
    : "grid-cols-[1fr_80px_80px_80px_80px_32px_32px]";

  return (
    <div className="space-y-3">
      <div className={cn("hidden md:grid gap-2 text-sm font-medium text-muted-foreground px-1", gridCols)}>
        <div>Description</div>
        <div className="text-center">Qty</div>
        <div className="text-right">Price</div>
        <div className="text-right">Total</div>
        <div className="text-center">Group</div>
        {showTaxColumn && <div className="text-center">{taxName}</div>}
        <div></div>
        <div></div>
      </div>

      {items.map((item) => {
        const allowedRates = getAllowedRates(country, item.line_group);
        const currentRate = item.tax_rate ?? getDefaultLineRate(country, item.line_group);
        const isCustom = !allowedRates.includes(currentRate);
        return (
          <div key={item.id} className={cn("grid gap-2 items-center", gridCols)}>
            <Input
              placeholder="Item description"
              value={item.description}
              onChange={(e) => updateItem(item.id, "description", e.target.value)}
            />
            <Input
              type="number"
              min="1"
              value={item.quantity}
              onChange={(e) => updateItem(item.id, "quantity", parseFloat(e.target.value) || 0)}
              className="text-center"
              aria-label="Quantity"
            />
            <Input
              type="number"
              min="0"
              step="0.01"
              value={item.unit_price}
              onChange={(e) => updateItem(item.id, "unit_price", parseFloat(e.target.value) || 0)}
              className="text-right"
              aria-label="Unit price"
            />
            <div className="text-right font-medium pr-2 text-sm">
              {formatCurrency(item.quantity * item.unit_price)}
            </div>
            <Select
              value={item.line_group || "Materials"}
              onValueChange={(v) => updateItem(item.id, "line_group", v)}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LINE_GROUPS.map((g) => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {showTaxColumn && (
              <Select
                value={isCustom ? "__custom__" : String(currentRate)}
                onValueChange={(v) => {
                  if (v === "__custom__") return;
                  updateItem(item.id, "tax_rate", parseFloat(v));
                }}
              >
                <SelectTrigger className="h-9 text-xs" aria-label={`${taxName} rate`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allowedRates.map((r) => (
                    <SelectItem key={r} value={String(r)}>{r}%</SelectItem>
                  ))}
                  {isCustom && (
                    <SelectItem value="__custom__">{currentRate}% (custom)</SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => updateItem(item.id, "visible", !(item.visible !== false))}
              className="h-8 w-8 text-muted-foreground"
              title={item.visible !== false ? "Visible to customer" : "Hidden from customer"}
            >
              {item.visible !== false ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-destructive" />}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeItem(item.id)}
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      })}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addItem}
        className="w-full mt-2"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Line Item
      </Button>
    </div>
  );
}
