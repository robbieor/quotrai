import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Eye, EyeOff } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrencyValue, DEFAULT_CURRENCY } from "@/utils/currencyUtils";
import type { LineGroup } from "@/types/pricingDisplay";
import { LINE_GROUPS } from "@/types/pricingDisplay";

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_group?: string;
  visible?: boolean;
}

interface InvoiceLineItemsProps {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
  currencyCode?: string;
}

export function InvoiceLineItems({ items, onChange, currencyCode = DEFAULT_CURRENCY }: InvoiceLineItemsProps) {
  const addItem = () => {
    onChange([
      ...items,
      { id: crypto.randomUUID(), description: "", quantity: 1, unit_price: 0, line_group: "Materials", visible: true },
    ]);
  };

  const removeItem = (id: string) => {
    onChange(items.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, field: keyof LineItem, value: string | number | boolean) => {
    onChange(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const formatCurrency = (value: number) => {
    return formatCurrencyValue(value, currencyCode);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_80px_80px_80px_80px_32px_32px] gap-2 text-sm font-medium text-muted-foreground px-1">
        <div>Description</div>
        <div className="text-center">Qty</div>
        <div className="text-right">Price</div>
        <div className="text-right">Total</div>
        <div className="text-center">Group</div>
        <div></div>
        <div></div>
      </div>

      {items.map((item) => (
        <div key={item.id} className="grid grid-cols-[1fr_80px_80px_80px_80px_32px_32px] gap-2 items-center">
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
          />
          <Input
            type="number"
            min="0"
            step="0.01"
            value={item.unit_price}
            onChange={(e) => updateItem(item.id, "unit_price", parseFloat(e.target.value) || 0)}
            className="text-right"
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
      ))}

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
