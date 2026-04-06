import type { PricingDisplayMode, LineGroup } from "@/types/pricingDisplay";
import { formatCurrencyValue, DEFAULT_CURRENCY } from "@/utils/currencyUtils";

interface PreviewLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  line_group?: string;
  visible?: boolean;
}

interface LineItemsPreviewProps {
  items: PreviewLineItem[];
  displayMode: PricingDisplayMode;
  currencyCode?: string;
  taxRate?: number;
}

export function LineItemsPreview({ items, displayMode, currencyCode = DEFAULT_CURRENCY, taxRate = 0 }: LineItemsPreviewProps) {
  const fmt = (v: number) => formatCurrencyValue(v, currencyCode);
  const visibleItems = items.filter((i) => i.visible !== false);
  const total = visibleItems.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const taxAmount = total * (taxRate / 100);

  if (displayMode === 'summary') {
    return (
      <div className="space-y-2 text-sm">
        <div className="flex justify-between font-medium">
          <span>Total</span>
          <span>{fmt(total)}</span>
        </div>
        {taxRate > 0 && (
          <div className="flex justify-between text-muted-foreground">
            <span>Tax ({taxRate}%)</span>
            <span>{fmt(taxAmount)}</span>
          </div>
        )}
        <div className="flex justify-between font-semibold border-t pt-2">
          <span>Grand Total</span>
          <span>{fmt(total + taxAmount)}</span>
        </div>
      </div>
    );
  }

  if (displayMode === 'grouped') {
    const groups: Record<string, number> = {};
    visibleItems.forEach((i) => {
      const g = i.line_group || 'Materials';
      groups[g] = (groups[g] || 0) + i.quantity * i.unit_price;
    });

    return (
      <div className="space-y-2 text-sm">
        {Object.entries(groups).map(([group, subtotal]) => (
          <div key={group} className="flex justify-between">
            <span className="font-medium">{group}</span>
            <span>{fmt(subtotal)}</span>
          </div>
        ))}
        <div className="flex justify-between font-semibold border-t pt-2">
          <span>Total</span>
          <span>{fmt(total)}</span>
        </div>
      </div>
    );
  }

  if (displayMode === 'items_only') {
    return (
      <div className="space-y-1 text-sm">
        {visibleItems.map((item, i) => (
          <div key={i} className="flex justify-between">
            <span>{item.description}</span>
            <span className="text-muted-foreground">×{item.quantity}</span>
          </div>
        ))}
        <div className="flex justify-between font-semibold border-t pt-2">
          <span>Total</span>
          <span>{fmt(total)}</span>
        </div>
      </div>
    );
  }

  // detailed (default)
  return (
    <div className="space-y-1 text-sm">
      <div className="grid grid-cols-12 gap-2 font-medium text-muted-foreground">
        <div className="col-span-5">Description</div>
        <div className="col-span-2 text-center">Qty</div>
        <div className="col-span-2 text-right">Price</div>
        <div className="col-span-3 text-right">Total</div>
      </div>
      {visibleItems.map((item, i) => (
        <div key={i} className="grid grid-cols-12 gap-2">
          <div className="col-span-5">{item.description}</div>
          <div className="col-span-2 text-center">{item.quantity}</div>
          <div className="col-span-2 text-right">{fmt(item.unit_price)}</div>
          <div className="col-span-3 text-right">{fmt(item.quantity * item.unit_price)}</div>
        </div>
      ))}
      <div className="flex justify-between font-semibold border-t pt-2">
        <span>Total</span>
        <span>{fmt(total)}</span>
      </div>
    </div>
  );
}
