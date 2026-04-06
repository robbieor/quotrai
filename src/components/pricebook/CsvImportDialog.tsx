import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useSupplierSettings } from "@/hooks/useSupplierSettings";
import { toast } from "sonner";

interface CsvImportDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onComplete: () => void;
}

export function CsvImportDialog({ open, onOpenChange, onComplete }: CsvImportDialogProps) {
  const { profile } = useProfile();
  const { getSettingForSupplier } = useSupplierSettings();
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<{ headers: string[]; rowCount: number } | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const text = await f.text();
    const lines = text.split("\n").filter(Boolean);
    if (lines.length < 2) { toast.error("CSV must have header + data"); return; }
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/^["']|["']$/g, ""));
    setPreview({ headers, rowCount: lines.length - 1 });
  };

  const handleImport = async () => {
    if (!file || !profile?.team_id) return;
    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split("\n").filter(Boolean);
      const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/^["']|["']$/g, ""));

      const FIELD_MAP: Record<string, string> = {
        item_name: "item_name", product_name: "item_name", name: "item_name",
        supplier_name: "supplier_name", supplier: "supplier_name",
        supplier_sku: "supplier_sku", sku: "supplier_sku", product_code: "supplier_sku",
        manufacturer: "manufacturer", mfr: "manufacturer", brand: "manufacturer",
        category: "category",
        subcategory: "subcategory",
        unit: "unit", unit_of_measure: "unit",
        cost_price: "cost_price", customer_price: "cost_price", net_price: "cost_price",
        sell_price: "sell_price",
        website_price: "website_price", list_price: "website_price", rrp: "website_price",
        description: "description",
        trade_type: "trade_type",
        image_url: "image_url",
      };

      const rows = lines.slice(1).map((line) => {
        const vals = line.split(",").map(v => v.trim().replace(/^["']|["']$/g, ""));
        const raw: Record<string, string> = {};
        headers.forEach((h, i) => { raw[h] = vals[i] || ""; });

        const mapped: Record<string, any> = { team_id: profile.team_id };
        for (const [csvCol, dbCol] of Object.entries(FIELD_MAP)) {
          if (raw[csvCol] !== undefined && raw[csvCol] !== "") {
            mapped[dbCol] = raw[csvCol];
          }
        }

        // Parse numbers
        if (mapped.cost_price) mapped.cost_price = parseFloat(mapped.cost_price) || 0;
        if (mapped.sell_price) mapped.sell_price = parseFloat(mapped.sell_price) || 0;
        if (mapped.website_price) mapped.website_price = parseFloat(mapped.website_price) || null;

        // Apply supplier discount if we have website_price but no cost_price
        if (mapped.website_price && !mapped.cost_price && mapped.supplier_name) {
          const setting = getSettingForSupplier(mapped.supplier_name);
          const disc = setting?.discount_percent ?? 0;
          const mkup = setting?.default_markup_percent ?? 30;
          mapped.discount_percent = disc;
          mapped.markup_percent = mkup;
          mapped.cost_price = +(mapped.website_price * (1 - disc / 100)).toFixed(2);
          if (!mapped.sell_price) {
            mapped.sell_price = +(mapped.cost_price * (1 + mkup / 100)).toFixed(2);
          }
        }

        if (!mapped.item_name) return null;
        if (!mapped.unit) mapped.unit = "each";
        if (!mapped.cost_price) mapped.cost_price = 0;
        if (!mapped.sell_price) mapped.sell_price = 0;

        return mapped;
      }).filter(Boolean);

      if (rows.length === 0) throw new Error("No valid rows found");

      const { error } = await supabase.from("team_catalog_items" as any).insert(rows);
      if (error) throw error;

      toast.success(`Imported ${rows.length} items`);
      onComplete();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Import CSV Price List</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>CSV File</Label>
            <label className="mt-1 flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl p-6 cursor-pointer hover:border-primary/40 transition-colors">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{file ? file.name : "Choose CSV file"}</span>
              <input type="file" accept=".csv" className="hidden" onChange={handleFile} />
            </label>
          </div>

          {preview && (
            <div className="text-xs space-y-1">
              <p className="text-muted-foreground">{preview.rowCount} rows detected</p>
              <p className="text-muted-foreground">
                Columns: {preview.headers.join(", ")}
              </p>
              <p className="text-[10px] text-muted-foreground/70">
                Supported: item_name/product_name, supplier_name, supplier_sku/sku, manufacturer, category, unit, cost_price, sell_price, website_price/list_price, trade_type
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleImport} disabled={!file || importing}>
            {importing ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Importing...</> : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
