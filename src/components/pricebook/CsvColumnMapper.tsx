import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";

const FIELDS = [
  { key: "item_name", label: "Item Name", required: true },
  { key: "supplier_name", label: "Supplier Name", required: false },
  { key: "supplier_sku", label: "SKU", required: false },
  { key: "manufacturer", label: "Manufacturer", required: false },
  { key: "manufacturer_part_number", label: "MPN", required: false },
  { key: "category", label: "Category", required: false },
  { key: "subcategory", label: "Subcategory", required: false },
  { key: "trade_type", label: "Trade Type", required: false },
  { key: "unit", label: "Unit", required: false },
  { key: "website_price", label: "Website / List Price", required: false },
  { key: "discount_percent", label: "Discount %", required: false },
  { key: "cost_price", label: "Cost Price", required: false },
  { key: "markup_percent", label: "Markup %", required: false },
  { key: "sell_price", label: "Sell Price", required: false },
  { key: "image_url", label: "Image URL", required: false },
] as const;

interface CsvColumnMapperProps {
  csvHeaders: string[];
  mapping: Record<string, string>;
  onChange: (mapping: Record<string, string>) => void;
  rowCount: number;
  sampleRow?: Record<string, string>;
}

export function CsvColumnMapper({ csvHeaders, mapping, onChange, rowCount, sampleRow }: CsvColumnMapperProps) {
  const mappedCount = Object.values(mapping).filter(Boolean).length;
  const requiredMapped = FIELDS.filter(f => f.required).every(f => mapping[f.key]);

  const handleChange = (fieldKey: string, headerValue: string) => {
    const next = { ...mapping };
    if (headerValue === "__none__") {
      delete next[fieldKey];
    } else {
      next[fieldKey] = headerValue;
    }
    onChange(next);
  };

  const getSample = (fieldKey: string) => {
    const header = mapping[fieldKey];
    return header && sampleRow ? (sampleRow[header] || "—") : "—";
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Map CSV Columns</p>
        <div className="flex items-center gap-2">
          <Badge variant={requiredMapped ? "default" : "secondary"} className="text-xs">
            {mappedCount} mapped
          </Badge>
          <span className="text-xs text-muted-foreground">{rowCount} rows detected</span>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-muted/30 divide-y divide-border">
        {FIELDS.map((field) => (
          <div key={field.key} className="flex items-center gap-3 px-3 py-2">
            <div className="flex-1 min-w-0">
              <span className="text-sm text-foreground">{field.label}</span>
              {field.required && <span className="text-destructive ml-1 text-xs">*</span>}
              {mapping[field.key] && sampleRow && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  e.g. "{getSample(field.key)}"
                </p>
              )}
            </div>
            <div className="w-48">
              <Select
                value={mapping[field.key] || "__none__"}
                onValueChange={(v) => handleChange(field.key, v)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Skip —</SelectItem>
                  {csvHeaders.map((h) => (
                    <SelectItem key={h} value={h}>{h}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {mapping[field.key] && (
              <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
