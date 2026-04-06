import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";

const FIELDS = [
  { key: "product_name", label: "Product Name", required: true },
  { key: "supplier_sku", label: "SKU", required: false },
  { key: "description", label: "Description", required: false },
  { key: "trade_type", label: "Trade Type", required: false },
  { key: "category", label: "Category", required: false },
  { key: "subcategory", label: "Subcategory", required: false },
  { key: "unit", label: "Unit", required: false },
  { key: "source_price", label: "Source Price", required: true },
  { key: "manufacturer", label: "Manufacturer", required: false },
  { key: "image_url", label: "Image URL", required: false },
  { key: "product_url", label: "Product URL", required: false },
  { key: "currency", label: "Currency", required: false },
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

  const headerIndex = (header: string) => csvHeaders.indexOf(header);

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
                  e.g. "{sampleRow[headerIndex(mapping[field.key])] || "—"}"
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
              <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
