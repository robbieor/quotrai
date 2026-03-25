import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus } from "lucide-react";
import { formatCurrencyValue, DEFAULT_CURRENCY } from "@/utils/currencyUtils";

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
}

interface QuoteLineItemsProps {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
  currencyCode?: string;
}

export function QuoteLineItems({ items, onChange, currencyCode = DEFAULT_CURRENCY }: QuoteLineItemsProps) {
  const addItem = () => {
    onChange([
      ...items,
      { id: crypto.randomUUID(), description: "", quantity: 1, unit_price: 0 },
    ]);
  };

  const removeItem = (id: string) => {
    onChange(items.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, field: keyof LineItem, value: string | number) => {
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
      <div className="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground px-1">
        <div className="col-span-5">Description</div>
        <div className="col-span-2 text-center">Qty</div>
        <div className="col-span-2 text-right">Unit Price</div>
        <div className="col-span-2 text-right">Total</div>
        <div className="col-span-1"></div>
      </div>

      {items.map((item) => (
        <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
          <div className="col-span-5">
            <Input
              placeholder="Item description"
              value={item.description}
              onChange={(e) => updateItem(item.id, "description", e.target.value)}
            />
          </div>
          <div className="col-span-2">
            <Input
              type="number"
              min="1"
              value={item.quantity}
              onChange={(e) => updateItem(item.id, "quantity", parseFloat(e.target.value) || 0)}
              className="text-center"
            />
          </div>
          <div className="col-span-2">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={item.unit_price}
              onChange={(e) => updateItem(item.id, "unit_price", parseFloat(e.target.value) || 0)}
              className="text-right"
            />
          </div>
          <div className="col-span-2 text-right font-medium pr-2">
            {formatCurrency(item.quantity * item.unit_price)}
          </div>
          <div className="col-span-1 flex justify-end">
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
