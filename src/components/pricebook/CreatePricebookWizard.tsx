import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Globe, Upload, Package, Loader2, CheckCircle2, ArrowLeft, ArrowRight, Download, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useProfile } from "@/hooks/useProfile";
import { usePricebooks, type Pricebook } from "@/hooks/usePricebooks";
import { useTeamCatalog } from "@/hooks/useTeamCatalog";
import { useSupplierSettings } from "@/hooks/useSupplierSettings";
import { getAllTradeTypes } from "@/data/tradeCategoryMap";
import { CsvColumnMapper } from "./CsvColumnMapper";

type SourceType = "website" | "csv" | "manual";
type Step = "source" | "details" | "source_setup" | "commercial" | "review" | "importing" | "done";

interface CreatePricebookWizardProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onComplete: () => void;
}

interface ScrapedProduct {
  product_name: string;
  supplier_name: string;
  supplier_sku: string;
  website_price: number;
  image_url?: string;
  category?: string;
  subcategory?: string;
  manufacturer?: string;
  description?: string;
  unit_of_measure?: string;
}

const CSV_TEMPLATE_HEADERS = [
  "product_name", "supplier", "sku", "description", "trade_type", "category",
  "subcategory", "unit", "source_price", "manufacturer", "image_url",
  "product_url", "currency", "source_price_includes_vat", "customer_price"
];

const CSV_TEMPLATE_SAMPLE = [
  "10W LED Floodlight", "Wesco", "FL-10W-BK", "Black 10W LED floodlight IP65",
  "Electrical", "Lighting", "Floodlights", "each", "24.50", "Philips",
  "", "", "EUR", "no", ""
];

const REQUIRED_FIELDS = ["product_name", "source_price"];

export function CreatePricebookWizard({ open, onOpenChange, onComplete }: CreatePricebookWizardProps) {
  const { profile } = useProfile();
  const { createPricebook, updateItemCount } = usePricebooks();
  const { addItem } = useTeamCatalog();
  const { getSettingForSupplier, upsertSetting } = useSupplierSettings();

  const [step, setStep] = useState<Step>("source");
  const [sourceType, setSourceType] = useState<SourceType | null>(null);
  const [loading, setLoading] = useState(false);

  // Details
  const [name, setName] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [tradeType, setTradeType] = useState("Electrical");
  const [description, setDescription] = useState("");

  // Website source
  const [url, setUrl] = useState("");
  const [scrapedProduct, setScrapedProduct] = useState<ScrapedProduct | null>(null);

  // CSV source
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [csvErrors, setCsvErrors] = useState<string[]>([]);

  // Commercial
  const [discountPercent, setDiscountPercent] = useState("0");
  const [markupPercent, setMarkupPercent] = useState("30");

  // Result
  const [importCount, setImportCount] = useState(0);

  const reset = () => {
    setStep("source");
    setSourceType(null);
    setName("");
    setSupplierName("");
    setTradeType("Electrical");
    setDescription("");
    setUrl("");
    setScrapedProduct(null);
    setCsvFile(null);
    setCsvHeaders([]);
    setCsvRows([]);
    setColumnMapping({});
    setCsvErrors([]);
    setDiscountPercent("0");
    setMarkupPercent("30");
    setImportCount(0);
    setLoading(false);
  };

  const detectSupplierFromUrl = (u: string): string => {
    try {
      const host = new URL(u.startsWith("http") ? u : `https://${u}`).hostname.toLowerCase();
      if (host.includes("wesco")) return "Wesco";
      if (host.includes("cef")) return "CEF";
      if (host.includes("screwfix")) return "Screwfix";
      if (host.includes("toolstation")) return "Toolstation";
      if (host.includes("edmundson")) return "Edmundson";
      const clean = host.replace("www.", "").split(".")[0];
      return clean.charAt(0).toUpperCase() + clean.slice(1);
    } catch {
      return "";
    }
  };

  const handleUrlDetect = async () => {
    if (!url) return;
    setLoading(true);
    try {
      const supplier = detectSupplierFromUrl(url);
      setSupplierName(supplier);
      if (!name) setName(`${supplier} Pricebook`);

      const { data, error } = await supabase.functions.invoke("scrape-supplier-url", {
        body: { url: url.startsWith("http") ? url : `https://${url}` },
      });

      if (!error && data?.product) {
        setScrapedProduct(data.product);
        if (data.product.category) {
          // auto-detect trade from category if possible
        }
      }
      setStep("details");
    } catch (e: any) {
      toast.error(e.message || "Failed to analyze URL");
      // Still proceed to details — URL detection is best-effort
      const supplier = detectSupplierFromUrl(url);
      setSupplierName(supplier);
      if (!name) setName(`${supplier} Pricebook`);
      setStep("details");
    } finally {
      setLoading(false);
    }
  };

  const handleCsvFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setCsvFile(f);
    setCsvErrors([]);

    const text = await f.text();
    const lines = text.split("\n").filter(l => l.trim());
    if (lines.length < 2) {
      setCsvErrors(["CSV must have a header row and at least one data row"]);
      return;
    }

    const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/^["']|["']$/g, ""));
    setCsvHeaders(headers);

    // Auto-map columns
    const FIELD_MAP: Record<string, string> = {
      item_name: "product_name", product_name: "product_name", name: "product_name",
      supplier_name: "supplier", supplier: "supplier",
      supplier_sku: "sku", sku: "sku", product_code: "sku",
      manufacturer: "manufacturer", mfr: "manufacturer", brand: "manufacturer",
      category: "category", subcategory: "subcategory",
      unit: "unit", unit_of_measure: "unit",
      cost_price: "source_price", net_price: "source_price", source_price: "source_price",
      sell_price: "customer_price", customer_price: "customer_price",
      website_price: "source_price", list_price: "source_price", rrp: "source_price",
      description: "description", trade_type: "trade_type",
      image_url: "image_url", product_url: "product_url",
      currency: "currency",
    };

    const autoMap: Record<string, string> = {};
    headers.forEach(h => {
      const mapped = FIELD_MAP[h];
      if (mapped && !Object.values(autoMap).includes(mapped)) {
        autoMap[h] = mapped;
      }
    });
    setColumnMapping(autoMap);

    // Parse rows
    const rows = lines.slice(1).map(line => {
      const vals = line.split(",").map(v => v.trim().replace(/^["']|["']$/g, ""));
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = vals[i] || ""; });
      return row;
    });
    setCsvRows(rows);
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

  const validateCsv = (): boolean => {
    const errors: string[] = [];
    const mappedFields = Object.values(columnMapping);
    if (!mappedFields.includes("product_name")) errors.push("'product_name' column must be mapped");
    if (!mappedFields.includes("source_price")) errors.push("'source_price' column must be mapped");
    if (csvRows.length === 0) errors.push("No data rows found");
    setCsvErrors(errors);
    return errors.length === 0;
  };

  const handleCreate = async () => {
    if (!profile?.team_id) return;
    setStep("importing");
    setLoading(true);

    try {
      // Save supplier settings
      if (supplierName) {
        const disc = parseFloat(discountPercent) || 0;
        const mkup = parseFloat(markupPercent) || 30;
        await upsertSetting.mutateAsync({
          supplier_name: supplierName,
          discount_percent: disc,
          default_markup_percent: mkup,
        });
      }

      // Create pricebook
      const pb = await createPricebook.mutateAsync({
        name,
        supplier_name: supplierName || null,
        source_type: sourceType!,
        source_url: sourceType === "website" ? (url.startsWith("http") ? url : `https://${url}`) : null,
        trade_type: tradeType,
        last_synced_at: sourceType === "website" ? new Date().toISOString() : null,
      });

      const pricebookId = (pb as any)?.id;
      if (!pricebookId) throw new Error("Failed to create pricebook");

      const disc = parseFloat(discountPercent) || 0;
      const mkup = parseFloat(markupPercent) || 30;

      // Import items based on source
      if (sourceType === "website" && scrapedProduct) {
        const webPrice = scrapedProduct.website_price || 0;
        const costPrice = webPrice > 0 ? +(webPrice * (1 - disc / 100)).toFixed(2) : 0;
        const sellPrice = costPrice > 0 ? +(costPrice * (1 + mkup / 100)).toFixed(2) : 0;

        await addItem.mutateAsync({
          item_name: scrapedProduct.product_name,
          supplier_name: supplierName,
          supplier_sku: scrapedProduct.supplier_sku || null,
          manufacturer: scrapedProduct.manufacturer || null,
          category: scrapedProduct.category || null,
          subcategory: scrapedProduct.subcategory || null,
          trade_type: tradeType,
          unit: scrapedProduct.unit_of_measure || "each",
          website_price: webPrice || null,
          discount_percent: disc,
          cost_price: costPrice,
          markup_percent: mkup,
          sell_price: sellPrice,
          image_url: scrapedProduct.image_url || null,
          source_id: null,
          pricebook_id: pricebookId,
        } as any);
        setImportCount(1);
      } else if (sourceType === "csv" && csvRows.length > 0) {
        const reverseMap: Record<string, string> = {};
        Object.entries(columnMapping).forEach(([csvCol, dbField]) => {
          reverseMap[dbField] = csvCol;
        });

        const items = csvRows.map(row => {
          const get = (field: string) => row[reverseMap[field]] || "";
          const sourcePrice = parseFloat(get("source_price")) || 0;
          const customerPrice = parseFloat(get("customer_price")) || 0;
          const costPrice = sourcePrice > 0 ? +(sourcePrice * (1 - disc / 100)).toFixed(2) : 0;
          const sellPrice = customerPrice > 0 ? customerPrice : (costPrice > 0 ? +(costPrice * (1 + mkup / 100)).toFixed(2) : 0);

          const productName = get("product_name");
          if (!productName) return null;

          return {
            team_id: profile.team_id,
            pricebook_id: pricebookId,
            item_name: productName,
            supplier_name: get("supplier") || supplierName || null,
            supplier_sku: get("sku") || null,
            manufacturer: get("manufacturer") || null,
            category: get("category") || null,
            subcategory: get("subcategory") || null,
            trade_type: get("trade_type") || tradeType,
            unit: get("unit") || "each",
            website_price: sourcePrice || null,
            discount_percent: disc,
            cost_price: costPrice,
            markup_percent: mkup,
            sell_price: sellPrice,
            image_url: get("image_url") || null,
          };
        }).filter(Boolean);

        if (items.length > 0) {
          const { error } = await supabase.from("team_catalog_items" as any).insert(items);
          if (error) throw error;
          setImportCount(items.length);
        }
      }

      if (pricebookId) await updateItemCount(pricebookId);
      setStep("done");
      onComplete();
    } catch (e: any) {
      toast.error(e.message || "Failed to create pricebook");
      setStep("review");
    } finally {
      setLoading(false);
    }
  };

  const canProceed = (): boolean => {
    switch (step) {
      case "source": return !!sourceType;
      case "details": return !!name.trim();
      case "source_setup":
        if (sourceType === "website") return !!url;
        if (sourceType === "csv") return csvRows.length > 0 && Object.values(columnMapping).includes("product_name");
        return true;
      case "commercial": return true;
      case "review": return true;
      default: return false;
    }
  };

  const nextStep = () => {
    const flow: Step[] = ["source", "details", "source_setup", "commercial", "review"];
    // Skip source_setup for manual
    if (step === "details" && sourceType === "manual") {
      setStep("commercial");
      return;
    }
    if (step === "source_setup" && sourceType === "csv" && !validateCsv()) return;
    const idx = flow.indexOf(step);
    if (idx >= 0 && idx < flow.length - 1) setStep(flow[idx + 1]);
  };

  const prevStep = () => {
    const flow: Step[] = ["source", "details", "source_setup", "commercial", "review"];
    if (step === "commercial" && sourceType === "manual") {
      setStep("details");
      return;
    }
    const idx = flow.indexOf(step);
    if (idx > 0) setStep(flow[idx - 1]);
  };

  const stepNumber = () => {
    const flow = sourceType === "manual"
      ? ["source", "details", "commercial", "review"]
      : ["source", "details", "source_setup", "commercial", "review"];
    return { current: flow.indexOf(step) + 1, total: flow.length };
  };

  const sn = stepNumber();

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              {step === "importing" ? "Creating Pricebook..." : step === "done" ? "Pricebook Created" : "Create Pricebook"}
            </DialogTitle>
            {!["importing", "done"].includes(step) && (
              <Badge variant="secondary" className="text-[10px]">
                Step {sn.current} of {sn.total}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-2">
          {/* Step 1: Choose Source */}
          {step === "source" && (
            <div className="grid gap-3">
              <p className="text-sm text-muted-foreground">How do you want to add products?</p>
              {([
                { type: "website" as const, icon: Globe, title: "Supplier Website", desc: "Paste a URL to import products and pricing" },
                { type: "csv" as const, icon: Upload, title: "CSV Upload", desc: "Upload a supplier price list CSV" },
                { type: "manual" as const, icon: Package, title: "Manual Catalog", desc: "Create an empty catalog, add items later" },
              ]).map(s => (
                <button
                  key={s.type}
                  onClick={() => setSourceType(s.type)}
                  className={`flex items-start gap-4 p-4 rounded-xl border text-left transition-all ${
                    sourceType === s.type
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-border bg-card hover:border-primary/30"
                  }`}
                >
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <s.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{s.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Details */}
          {step === "details" && (
            <div className="space-y-4">
              <div>
                <Label>Pricebook Name *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Wesco Electrical Pricebook"
                  className="mt-1"
                  autoFocus
                />
              </div>
              <div>
                <Label>Supplier Name</Label>
                <Input
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="e.g. Wesco"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Trade Type</Label>
                <Select value={tradeType} onValueChange={setTradeType}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {getAllTradeTypes().map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Notes about this pricebook..."
                  className="mt-1"
                  rows={2}
                />
              </div>
            </div>
          )}

          {/* Step 3: Source Setup */}
          {step === "source_setup" && sourceType === "website" && (
            <div className="space-y-4">
              <div>
                <Label>Supplier Website or Product URL</Label>
                <div className="flex gap-2 mt-1.5">
                  <Input
                    placeholder="e.g. wesco.ie or https://www.wesco.ie/product/..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleUrlDetect()}
                    autoFocus
                  />
                  <Button onClick={handleUrlDetect} disabled={loading || !url} size="sm">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Detect"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Supported: Wesco.ie. More suppliers coming soon.
                </p>
              </div>

              {scrapedProduct && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">Product detected</span>
                  </div>
                  <p className="text-sm">{scrapedProduct.product_name}</p>
                  <p className="text-xs text-muted-foreground">
                    SKU: {scrapedProduct.supplier_sku} · €{scrapedProduct.website_price}
                  </p>
                </div>
              )}
            </div>
          )}

          {step === "source_setup" && sourceType === "csv" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Upload CSV</Label>
                <Button variant="ghost" size="sm" onClick={downloadTemplate} className="text-xs gap-1.5">
                  <Download className="h-3.5 w-3.5" />
                  Download Template
                </Button>
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <p className="text-xs font-medium mb-1.5">Required columns</p>
                <div className="flex flex-wrap gap-1.5">
                  {REQUIRED_FIELDS.map(f => (
                    <Badge key={f} variant="default" className="text-[10px]">{f}</Badge>
                  ))}
                </div>
                <p className="text-xs font-medium mt-3 mb-1.5">Recommended columns</p>
                <div className="flex flex-wrap gap-1.5">
                  {["supplier", "sku", "description", "category", "unit"].map(f => (
                    <Badge key={f} variant="secondary" className="text-[10px]">{f}</Badge>
                  ))}
                </div>
              </div>

              <label className="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl p-6 cursor-pointer hover:border-primary/40 transition-colors">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{csvFile ? csvFile.name : "Choose CSV file"}</span>
                <input type="file" accept=".csv" className="hidden" onChange={handleCsvFile} />
              </label>

              {csvHeaders.length > 0 && (
                <CsvColumnMapper
                  csvHeaders={csvHeaders}
                  mapping={columnMapping}
                  onChange={setColumnMapping}
                  rowCount={csvRows.length}
                  sampleRow={csvRows[0]}
                />
              )}

              {csvErrors.length > 0 && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  {csvErrors.map((err, i) => (
                    <p key={i} className="text-xs text-destructive flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                      {err}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Commercial Settings */}
          {step === "commercial" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Set your company's pricing rules for {supplierName || "this supplier"}.
                These are applied to all imported products.
              </p>

              <div className="rounded-xl border border-border p-4 space-y-4">
                <div>
                  <Label>Supplier Discount %</Label>
                  <p className="text-xs text-muted-foreground mb-1.5">
                    Your negotiated trade discount off the website/list price
                  </p>
                  <Input
                    type="number"
                    step="0.1"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(e.target.value)}
                    className="w-32"
                  />
                </div>

                <div>
                  <Label>Default Markup %</Label>
                  <p className="text-xs text-muted-foreground mb-1.5">
                    Your margin on top of net cost when selling to customers
                  </p>
                  <Input
                    type="number"
                    step="0.1"
                    value={markupPercent}
                    onChange={(e) => setMarkupPercent(e.target.value)}
                    className="w-32"
                  />
                </div>

                {/* Live preview */}
                <div className="border-t border-border pt-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">PRICING PREVIEW</p>
                  <div className="grid grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground">List Price</span>
                      <p className="font-medium">€100.00</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Discount</span>
                      <p className="font-medium">-{discountPercent}%</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Net Cost</span>
                      <p className="font-medium">
                        €{(100 * (1 - (parseFloat(discountPercent) || 0) / 100)).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Sell Price</span>
                      <p className="font-semibold">
                        €{(100 * (1 - (parseFloat(discountPercent) || 0) / 100) * (1 + (parseFloat(markupPercent) || 0) / 100)).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Review */}
          {step === "review" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Review and confirm your new pricebook.</p>

              <div className="rounded-xl border border-border divide-y divide-border">
                <div className="p-3 flex justify-between text-sm">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium">{name}</span>
                </div>
                {supplierName && (
                  <div className="p-3 flex justify-between text-sm">
                    <span className="text-muted-foreground">Supplier</span>
                    <span>{supplierName}</span>
                  </div>
                )}
                <div className="p-3 flex justify-between text-sm">
                  <span className="text-muted-foreground">Source</span>
                  <Badge variant="secondary" className="text-xs capitalize">{sourceType}</Badge>
                </div>
                <div className="p-3 flex justify-between text-sm">
                  <span className="text-muted-foreground">Trade</span>
                  <span>{tradeType}</span>
                </div>
                <div className="p-3 flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span>{discountPercent}%</span>
                </div>
                <div className="p-3 flex justify-between text-sm">
                  <span className="text-muted-foreground">Markup</span>
                  <span>{markupPercent}%</span>
                </div>
                {sourceType === "csv" && (
                  <div className="p-3 flex justify-between text-sm">
                    <span className="text-muted-foreground">Products to import</span>
                    <span className="font-medium">{csvRows.length}</span>
                  </div>
                )}
                {sourceType === "website" && scrapedProduct && (
                  <div className="p-3 flex justify-between text-sm">
                    <span className="text-muted-foreground">Products detected</span>
                    <span className="font-medium">1</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Importing */}
          {step === "importing" && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Creating "{name}" and importing products...</p>
            </div>
          )}

          {/* Done */}
          {step === "done" && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
              <p className="font-medium">"{name}" created</p>
              <p className="text-sm text-muted-foreground">
                {importCount > 0
                  ? `${importCount} product${importCount !== 1 ? "s" : ""} imported`
                  : "Empty catalog ready for products"}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0">
          {!["importing", "done"].includes(step) && (
            <>
              {step === "source" ? (
                <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              ) : (
                <Button variant="outline" onClick={prevStep} className="gap-1.5">
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </Button>
              )}
              {step === "review" ? (
                <Button onClick={handleCreate} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                  Create Pricebook
                </Button>
              ) : (
                <Button onClick={nextStep} disabled={!canProceed()} className="gap-1.5">
                  Next <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </>
          )}
          {step === "done" && (
            <Button onClick={() => { reset(); onOpenChange(false); }}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
