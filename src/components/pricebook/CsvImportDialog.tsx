import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useSupplierSettings } from "@/hooks/useSupplierSettings";
import { usePricebooks } from "@/hooks/usePricebooks";
import { toast } from "sonner";
import { CsvColumnMapper } from "./CsvColumnMapper";

interface CsvImportDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onComplete: () => void;
}

const CSV_TEMPLATE_HEADERS = [
  "item_name", "supplier_name", "supplier_sku", "manufacturer", "manufacturer_part_number",
  "category", "subcategory", "trade_type", "unit",
  "website_price", "discount_percent", "cost_price", "markup_percent", "sell_price",
  "image_url"
];

const CSV_TEMPLATE_SAMPLE = [
  "10W LED Floodlight", "My Supplier", "FL-10W-BK", "Philips", "MPN-12345",
  "Lighting", "Floodlights", "Electrical", "each",
  "24.50", "0", "24.50", "30", "31.85",
  ""
];

export function CsvImportDialog({ open, onOpenChange, onComplete }: CsvImportDialogProps) {
  const { profile } = useProfile();
  const { getSettingForSupplier } = useSupplierSettings();
  const { createPricebook, updateItemCount } = usePricebooks();
  const [importing, setImporting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [pricebookName, setPricebookName] = useState("");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});

  // Maps CSV header names → internal DB column names
  const FIELD_MAP: Record<string, string> = {
    item_name: "item_name", product_name: "item_name", name: "item_name",
    supplier_name: "supplier_name", supplier: "supplier_name",
    supplier_sku: "supplier_sku", sku: "supplier_sku", product_code: "supplier_sku",
    manufacturer: "manufacturer", mfr: "manufacturer", brand: "manufacturer",
    manufacturer_part_number: "manufacturer_part_number", mpn: "manufacturer_part_number",
    category: "category", subcategory: "subcategory",
    unit: "unit", unit_of_measure: "unit",
    website_price: "website_price", list_price: "website_price", rrp: "website_price", source_price: "website_price",
    discount_percent: "discount_percent",
    cost_price: "cost_price", net_price: "cost_price",
    markup_percent: "markup_percent",
    sell_price: "sell_price",
    trade_type: "trade_type",
    image_url: "image_url",
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const text = await f.text();
    const lines = text.split("\n").filter(l => l.trim());
    if (lines.length < 2) { toast.error("CSV must have header + data"); return; }
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/^["']|["']$/g, ""));
    setCsvHeaders(headers);

    // Auto-map
    const autoMap: Record<string, string> = {};
    headers.forEach(h => {
      const mapped = FIELD_MAP[h];
      if (mapped && !Object.values(autoMap).includes(mapped)) {
        autoMap[h] = mapped;
      }
    });
    setColumnMapping(autoMap);

    const rows = lines.slice(1).map(line => {
      const vals = line.split(",").map(v => v.trim().replace(/^["']|["']$/g, ""));
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = vals[i] || ""; });
      return row;
    });
    setCsvRows(rows);

    if (!pricebookName) setPricebookName(f.name.replace(/\.csv$/i, ""));
  };

  const downloadTemplate = () => {
    const csv = [CSV_TEMPLATE_HEADERS.join(","), CSV_TEMPLATE_SAMPLE.join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pricebook_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!file || !profile?.team_id || csvRows.length === 0) return;
    if (!Object.values(columnMapping).includes("product_name")) {
      toast.error("Map at least the 'Product Name' column");
      return;
    }
    setImporting(true);
    try {
      // Create pricebook
      const pb = await createPricebook.mutateAsync({
        name: pricebookName || file.name.replace(/\.csv$/i, ""),
        supplier_name: null,
        source_type: "csv",
        source_url: null,
        trade_type: null,
        last_synced_at: new Date().toISOString(),
      });
      const pricebookId = (pb as any)?.id;
      if (!pricebookId) throw new Error("Failed to create pricebook");

      // Create import job
      const { data: importJob } = await supabase
        .from("pricebook_import_jobs" as any)
        .insert({
          team_id: profile.team_id,
          pricebook_id: pricebookId,
          source_type: "csv",
          status: "running",
          items_found: csvRows.length,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();
      const jobId = (importJob as any)?.id;

      // Build reverse map: db_field -> csv_header
      const reverseMap: Record<string, string> = {};
      Object.entries(columnMapping).forEach(([csvCol, dbField]) => {
        reverseMap[dbField] = csvCol;
      });

      const items = csvRows.map(row => {
        const get = (field: string) => row[reverseMap[field]] || "";
        const productName = get("product_name");
        if (!productName) return null;

        const sourcePrice = parseFloat(get("source_price")) || 0;
        const supplierName = get("supplier") || null;

        let disc = 0;
        let mkup = 30;
        if (supplierName) {
          const setting = getSettingForSupplier(supplierName);
          disc = setting?.discount_percent ?? 0;
          mkup = setting?.default_markup_percent ?? 30;
        }

        const costPrice = sourcePrice > 0 ? +(sourcePrice * (1 - disc / 100)).toFixed(2) : 0;
        const sellPrice = costPrice > 0 ? +(costPrice * (1 + mkup / 100)).toFixed(2) : 0;

        return {
          team_id: profile.team_id,
          pricebook_id: pricebookId,
          item_name: productName,
          supplier_name: supplierName,
          supplier_sku: get("sku") || null,
          manufacturer: get("manufacturer") || null,
          category: get("category") || null,
          subcategory: get("subcategory") || null,
          trade_type: get("trade_type") || null,
          unit: get("unit") || "each",
          website_price: sourcePrice || null,
          discount_percent: disc,
          cost_price: costPrice,
          markup_percent: mkup,
          sell_price: sellPrice,
          image_url: get("image_url") || null,
        };
      }).filter(Boolean);

      if (items.length === 0) throw new Error("No valid rows found");

      const { error } = await supabase.from("team_catalog_items" as any).insert(items);
      if (error) throw error;

      // Update import job
      if (jobId) {
        await supabase
          .from("pricebook_import_jobs" as any)
          .update({
            status: "completed",
            items_imported: items.length,
            items_failed: csvRows.length - items.length,
            completed_at: new Date().toISOString(),
          })
          .eq("id", jobId);
      }

      await updateItemCount(pricebookId);
      toast.success(`Imported ${items.length} items into "${pricebookName}"`);
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
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import CSV Price List</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          <div>
            <Label>Pricebook Name</Label>
            <Input
              value={pricebookName}
              onChange={(e) => setPricebookName(e.target.value)}
              placeholder="e.g. Supplier Q1 Pricelist"
              className="mt-1"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>CSV File</Label>
            <Button variant="ghost" size="sm" onClick={downloadTemplate} className="text-xs gap-1.5">
              <Download className="h-3.5 w-3.5" />
              Download Template
            </Button>
          </div>

          <label className="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl p-6 cursor-pointer hover:border-primary/40 transition-colors">
            <Upload className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{file ? file.name : "Choose CSV file"}</span>
            <input type="file" accept=".csv" className="hidden" onChange={handleFile} />
          </label>

          {csvHeaders.length > 0 && (
            <>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{csvRows.length} rows detected</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {csvHeaders.length} columns
                  </Badge>
                </div>
              </div>

              <CsvColumnMapper
                csvHeaders={csvHeaders}
                mapping={columnMapping}
                onChange={setColumnMapping}
                rowCount={csvRows.length}
                sampleRow={csvRows[0]}
              />
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleImport} disabled={!file || importing || csvRows.length === 0}>
            {importing ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Importing...</> : `Import ${csvRows.length} Items`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
