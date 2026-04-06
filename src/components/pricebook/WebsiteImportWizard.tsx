import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Globe, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSupplierSettings } from "@/hooks/useSupplierSettings";
import { usePricebooks, type Pricebook } from "@/hooks/usePricebooks";
import { useTeamCatalog } from "@/hooks/useTeamCatalog";
import { useProfile } from "@/hooks/useProfile";
import { TRADE_CATEGORY_MAP, getAllTradeTypes } from "@/data/tradeCategoryMap";

interface WebsiteImportWizardProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onComplete: (pricebook: Pricebook) => void;
}

type Step = "url" | "setup" | "importing" | "done";

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

export function WebsiteImportWizard({ open, onOpenChange, onComplete }: WebsiteImportWizardProps) {
  const [step, setStep] = useState<Step>("url");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [detectedSupplier, setDetectedSupplier] = useState("");
  const [pricebookName, setPricebookName] = useState("");
  const [tradeType, setTradeType] = useState("Electrical");
  const [scrapedProduct, setScrapedProduct] = useState<ScrapedProduct | null>(null);
  const [detectedCategories, setDetectedCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [importCount, setImportCount] = useState(0);

  const { getSettingForSupplier } = useSupplierSettings();
  const { createPricebook, updateItemCount } = usePricebooks();
  const { addItem } = useTeamCatalog();
  const { profile } = useProfile();

  const reset = () => {
    setStep("url");
    setUrl("");
    setDetectedSupplier("");
    setPricebookName("");
    setScrapedProduct(null);
    setDetectedCategories([]);
    setSelectedCategories([]);
    setImportCount(0);
  };

  const detectSupplierFromUrl = (u: string): string => {
    try {
      const host = new URL(u.startsWith("http") ? u : `https://${u}`).hostname.toLowerCase();
      if (host.includes("wesco")) return "Wesco";
      if (host.includes("cef")) return "CEF";
      if (host.includes("screwfix")) return "Screwfix";
      if (host.includes("toolstation")) return "Toolstation";
      if (host.includes("edmundson")) return "Edmundson";
      return host.replace("www.", "").split(".")[0].charAt(0).toUpperCase() + host.replace("www.", "").split(".")[0].slice(1);
    } catch {
      return "Unknown";
    }
  };

  const handleFetchUrl = async () => {
    if (!url) return;
    setLoading(true);
    try {
      const supplier = detectSupplierFromUrl(url);
      setDetectedSupplier(supplier);
      setPricebookName(`${supplier} Pricebook`);

      // Try scraping the URL for product data
      const { data, error } = await supabase.functions.invoke("scrape-supplier-url", {
        body: { url: url.startsWith("http") ? url : `https://${url}` },
      });

      if (!error && data?.product) {
        setScrapedProduct(data.product);
        if (data.product.category) {
          setDetectedCategories([data.product.category]);
          setSelectedCategories([data.product.category]);
        }
      }

      // Set some default categories based on trade
      if (!data?.product?.category) {
        const trades = Object.keys(TRADE_CATEGORY_MAP);
        const defaultTrade = trades.includes("Electrical") ? "Electrical" : trades[0] || "General";
        setTradeType(defaultTrade);
        const cats = Object.keys(TRADE_CATEGORY_MAP[defaultTrade as keyof typeof TRADE_CATEGORY_MAP] || {});
        setDetectedCategories(cats.slice(0, 8));
        setSelectedCategories(cats.slice(0, 8));
      }

      setStep("setup");
    } catch (e: any) {
      toast.error(e.message || "Failed to analyze URL");
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!profile?.team_id) return;
    setStep("importing");
    setLoading(true);

    try {
      // Create the pricebook
      const pb = await createPricebook.mutateAsync({
        name: pricebookName,
        supplier_name: detectedSupplier,
        source_type: "website",
        source_url: url.startsWith("http") ? url : `https://${url}`,
        trade_type: tradeType,
        last_synced_at: new Date().toISOString(),
      });

      const pricebookId = (pb as any)?.id;

      // Create import job
      const { data: importJob } = await supabase
        .from("pricebook_import_jobs" as any)
        .insert({
          team_id: profile.team_id,
          pricebook_id: pricebookId,
          source_type: "website",
          status: "running",
          started_at: new Date().toISOString(),
        })
        .select()
        .single();
      const jobId = (importJob as any)?.id;

      let itemsImported = 0;

      // If we have a scraped product, add it
      if (scrapedProduct && pricebookId) {
        const setting = getSettingForSupplier(detectedSupplier);
        const discount = setting?.discount_percent ?? 0;
        const markup = setting?.default_markup_percent ?? 30;
        const webPrice = scrapedProduct.website_price || 0;
        const costPrice = webPrice > 0 ? +(webPrice * (1 - discount / 100)).toFixed(2) : 0;
        const sellPrice = costPrice > 0 ? +(costPrice * (1 + markup / 100)).toFixed(2) : 0;

        const { error: itemErr } = await supabase
          .from("team_catalog_items" as any)
          .insert({
            team_id: profile.team_id,
            pricebook_id: pricebookId,
            item_name: scrapedProduct.product_name,
            supplier_name: detectedSupplier,
            supplier_sku: scrapedProduct.supplier_sku || null,
            manufacturer: scrapedProduct.manufacturer || null,
            category: scrapedProduct.category || null,
            subcategory: scrapedProduct.subcategory || null,
            trade_type: tradeType,
            unit: scrapedProduct.unit_of_measure || "each",
            website_price: webPrice || null,
            discount_percent: discount,
            cost_price: costPrice,
            markup_percent: markup,
            sell_price: sellPrice,
            image_url: scrapedProduct.image_url || null,
          });
        if (!itemErr) itemsImported = 1;
        setImportCount(itemsImported);
      }

      // Update import job
      if (jobId) {
        await supabase
          .from("pricebook_import_jobs" as any)
          .update({
            status: "completed",
            items_found: scrapedProduct ? 1 : 0,
            items_imported: itemsImported,
            items_failed: scrapedProduct ? 1 - itemsImported : 0,
            completed_at: new Date().toISOString(),
          })
          .eq("id", jobId);
      }

      if (pricebookId) await updateItemCount(pricebookId);

      setStep("done");
      if (pb) {
        onComplete(pb as unknown as Pricebook);
      }
    } catch (e: any) {
      toast.error(e.message || "Import failed");
      setStep("setup");
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {step === "url" && "Import from Supplier Website"}
            {step === "setup" && "Import Setup"}
            {step === "importing" && "Importing..."}
            {step === "done" && "Import Complete"}
          </DialogTitle>
        </DialogHeader>

        {step === "url" && (
          <div className="space-y-4">
            <div>
              <Label>Supplier Website or Product URL</Label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  placeholder="e.g. wesco.ie or https://www.wesco.ie/product/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleFetchUrl()}
                  autoFocus
                />
                <Button onClick={handleFetchUrl} disabled={loading || !url}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Detect"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                Paste a homepage, category page, or product URL. Foreman will detect the supplier and available products.
              </p>
            </div>
          </div>
        )}

        {step === "setup" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex items-center gap-3">
              <Globe className="h-5 w-5 text-primary flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Detected: {detectedSupplier}</p>
                <p className="text-xs text-muted-foreground truncate">{url}</p>
              </div>
            </div>

            <div className="grid gap-3">
              <div>
                <Label>Pricebook Name</Label>
                <Input
                  value={pricebookName}
                  onChange={(e) => setPricebookName(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Trade Type</Label>
                <Select value={tradeType} onValueChange={setTradeType}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getAllTradeTypes().map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {detectedCategories.length > 0 && (
              <div>
                <Label className="mb-2 block">Categories to Import</Label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {detectedCategories.map((cat) => (
                    <label
                      key={cat}
                      className="flex items-center gap-2 p-2 rounded-lg border border-border hover:bg-accent/30 cursor-pointer text-sm"
                    >
                      <Checkbox
                        checked={selectedCategories.includes(cat)}
                        onCheckedChange={() => toggleCategory(cat)}
                      />
                      {cat}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {scrapedProduct && (
              <div className="rounded-xl border border-border p-3 bg-muted/30">
                <p className="text-xs text-muted-foreground mb-1">Product detected:</p>
                <p className="text-sm font-medium">{scrapedProduct.product_name}</p>
                <p className="text-xs text-muted-foreground">
                  {scrapedProduct.supplier_sku} · €{scrapedProduct.website_price}
                </p>
              </div>
            )}
          </div>
        )}

        {step === "importing" && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Creating "{pricebookName}" and importing products...</p>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
            <p className="font-medium">"{pricebookName}" created</p>
            <p className="text-sm text-muted-foreground">
              {importCount} product{importCount !== 1 ? "s" : ""} imported
            </p>
          </div>
        )}

        <DialogFooter>
          {step === "url" && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          )}
          {step === "setup" && (
            <>
              <Button variant="outline" onClick={() => setStep("url")}>Back</Button>
              <Button onClick={handleImport} disabled={!pricebookName}>
                Create & Import
              </Button>
            </>
          )}
          {step === "done" && (
            <Button onClick={() => { reset(); onOpenChange(false); }}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
