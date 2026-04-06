import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Loader2, Globe, CheckCircle2, Search, Package, AlertCircle, FolderOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSupplierSettings } from "@/hooks/useSupplierSettings";
import { usePricebooks, type Pricebook } from "@/hooks/usePricebooks";
import { useProfile } from "@/hooks/useProfile";
import { getAllTradeTypes } from "@/data/tradeCategoryMap";

interface WebsiteImportWizardProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onComplete: (pricebook: Pricebook) => void;
  /** If provided, import into this existing pricebook instead of creating a new one */
  existingPricebook?: Pricebook | null;
}

type Step = "domain" | "mapping" | "categories" | "scraping" | "importing" | "done";

interface CategoryGroup {
  name: string;
  count: number;
  urls: string[];
}

interface ScrapedProduct {
  product_name: string;
  supplier_sku: string;
  website_price: number | null;
  image_url?: string;
  category?: string;
  subcategory?: string;
  manufacturer?: string;
  source_url?: string;
  unit_of_measure?: string;
}

export function WebsiteImportWizard({ open, onOpenChange, onComplete, existingPricebook }: WebsiteImportWizardProps) {
  const [step, setStep] = useState<Step>("domain");
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Map phase
  const [categories, setCategories] = useState<CategoryGroup[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [totalProductUrls, setTotalProductUrls] = useState(0);

  // Scrape phase
  const [scrapedProducts, setScrapedProducts] = useState<ScrapedProduct[]>([]);
  const [scrapeProgress, setScrapeProgress] = useState({ done: 0, total: 0 });

  // Config (only used when creating new pricebook)
  const [pricebookName, setPricebookName] = useState("");
  const [tradeType, setTradeType] = useState(existingPricebook?.trade_type || "Electrical");

  // Import progress
  const [importProgress, setImportProgress] = useState(0);
  const [importCount, setImportCount] = useState(0);

  const { getSettingForSupplier } = useSupplierSettings();
  const { createPricebook, updateItemCount } = usePricebooks();
  const { profile } = useProfile();

  const isAddingToExisting = !!existingPricebook;

  const selectedUrlCount = useMemo(() => {
    return categories
      .filter((c) => selectedCategories.has(c.name))
      .reduce((sum, c) => sum + c.count, 0);
  }, [categories, selectedCategories]);

  const reset = () => {
    setStep("domain");
    setDomain("");
    setCategories([]);
    setSelectedCategories(new Set());
    setTotalProductUrls(0);
    setScrapedProducts([]);
    setScrapeProgress({ done: 0, total: 0 });
    setPricebookName("");
    setTradeType(existingPricebook?.trade_type || "Electrical");
    setImportProgress(0);
    setImportCount(0);
    setError("");
    setLoading(false);
  };

  const detectSupplierName = (d: string): string => {
    const lower = d.toLowerCase();
    if (lower.includes("wesco")) return "Wesco";
    if (lower.includes("cef")) return "CEF";
    if (lower.includes("screwfix")) return "Screwfix";
    if (lower.includes("edmundson")) return "Edmundson";
    const clean = lower.replace("www.", "").split(".")[0];
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  };

  const handleMap = async () => {
    if (!domain) return;
    setLoading(true);
    setError("");
    setStep("mapping");

    try {
      const { data, error: fnErr } = await supabase.functions.invoke("discover-supplier-products", {
        body: { mode: "map", domain: domain.trim() },
      });

      if (fnErr) throw new Error(fnErr.message || "Mapping failed");
      if (data?.error) throw new Error(data.error);

      const cats: CategoryGroup[] = data?.categories || [];
      setCategories(cats);
      setTotalProductUrls(data?.total_product_urls || 0);

      if (cats.length === 0) {
        setError("No product pages found. Try a different supplier domain.");
        setStep("domain");
      } else {
        setSelectedCategories(new Set(cats.map((c) => c.name)));
        if (!isAddingToExisting) {
          const supplier = detectSupplierName(domain);
          setPricebookName(`${supplier} Pricebook`);
        }
        setStep("categories");
      }
    } catch (e: any) {
      setError(e.message || "Mapping failed");
      setStep("domain");
      toast.error(e.message || "Mapping failed");
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (name: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleAllCategories = () => {
    if (selectedCategories.size === categories.length) {
      setSelectedCategories(new Set());
    } else {
      setSelectedCategories(new Set(categories.map((c) => c.name)));
    }
  };

  const handleScrapeAndImport = async () => {
    if (!profile?.team_id || selectedCategories.size === 0) return;
    setStep("scraping");
    setLoading(true);

    try {
      const allUrls = categories
        .filter((c) => selectedCategories.has(c.name))
        .flatMap((c) => c.urls);

      const totalToScrape = allUrls.length;
      setScrapeProgress({ done: 0, total: totalToScrape });

      const allProducts: ScrapedProduct[] = [];
      for (let offset = 0; offset < allUrls.length; offset += 200) {
        const batch = allUrls.slice(offset, offset + 200);
        const { data, error: fnErr } = await supabase.functions.invoke("discover-supplier-products", {
          body: { mode: "scrape", urls: batch },
        });

        if (fnErr) {
          console.error("Batch scrape error:", fnErr);
          continue;
        }

        const products: ScrapedProduct[] = data?.products || [];
        allProducts.push(...products);
        setScrapeProgress({ done: Math.min(offset + 200, totalToScrape), total: totalToScrape });
        setScrapedProducts([...allProducts]);
      }

      if (allProducts.length === 0) {
        toast.error("No products could be scraped. Try different categories.");
        setStep("categories");
        setLoading(false);
        return;
      }

      // Now import
      setStep("importing");

      const supplier = detectSupplierName(domain);
      let pricebookId: string;

      if (isAddingToExisting) {
        pricebookId = existingPricebook!.id;
      } else {
        const pb = await createPricebook.mutateAsync({
          name: pricebookName,
          supplier_name: null, // Multi-supplier: don't lock to one supplier
          source_type: "website",
          source_url: domain.startsWith("http") ? domain : `https://${domain}`,
          trade_type: tradeType,
          last_synced_at: new Date().toISOString(),
        });
        pricebookId = (pb as any)?.id;
      }

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

      let imported = 0;
      const activeTradeType = isAddingToExisting ? (existingPricebook!.trade_type || tradeType) : tradeType;

      for (let i = 0; i < allProducts.length; i++) {
        const product = allProducts[i];
        const setting = getSettingForSupplier(supplier);
        const discount = setting?.discount_percent ?? 0;
        const markup = setting?.default_markup_percent ?? 30;
        const webPrice = product.website_price || 0;
        const costPrice = webPrice > 0 ? +(webPrice * (1 - discount / 100)).toFixed(2) : 0;
        const sellPrice = costPrice > 0 ? +(costPrice * (1 + markup / 100)).toFixed(2) : 0;

        const { error: itemErr } = await supabase
          .from("team_catalog_items" as any)
          .insert({
            team_id: profile.team_id,
            pricebook_id: pricebookId,
            item_name: product.product_name,
            supplier_name: supplier,
            supplier_sku: product.supplier_sku || null,
            manufacturer: product.manufacturer || null,
            category: product.category || null,
            subcategory: product.subcategory || null,
            trade_type: activeTradeType,
            unit: product.unit_of_measure || "each",
            website_price: webPrice || null,
            discount_percent: discount,
            cost_price: costPrice,
            markup_percent: markup,
            sell_price: sellPrice,
            image_url: product.image_url || null,
          });

        if (!itemErr) imported++;
        setImportProgress(Math.round(((i + 1) / allProducts.length) * 100));
        setImportCount(imported);
      }

      if (jobId) {
        await supabase
          .from("pricebook_import_jobs" as any)
          .update({
            status: "completed",
            items_found: allProducts.length,
            items_imported: imported,
            items_failed: allProducts.length - imported,
            completed_at: new Date().toISOString(),
          })
          .eq("id", jobId);
      }

      await updateItemCount(pricebookId);
      setStep("done");

      // Return the pricebook for navigation
      if (!isAddingToExisting) {
        // Refetch to get the created pricebook
        const { data: freshPb } = await supabase
          .from("team_pricebooks" as any)
          .select("*")
          .eq("id", pricebookId)
          .single();
        if (freshPb) onComplete(freshPb as unknown as Pricebook);
      } else {
        onComplete(existingPricebook!);
      }
    } catch (e: any) {
      toast.error(e.message || "Import failed");
      setStep("categories");
    } finally {
      setLoading(false);
    }
  };

  const title = isAddingToExisting
    ? `Add Products to "${existingPricebook!.name}"`
    : "Import from Supplier Website";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {step === "domain" && title}
            {step === "mapping" && "Scanning Supplier..."}
            {step === "categories" && "Select Product Categories"}
            {step === "scraping" && "Scraping Products..."}
            {step === "importing" && "Importing Products..."}
            {step === "done" && "Import Complete"}
          </DialogTitle>
        </DialogHeader>

        {step === "domain" && (
          <div className="space-y-4">
            <div>
              <Label>Supplier Domain</Label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  placeholder="e.g. wesco.ie, cef.ie, screwfix.ie"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleMap()}
                  autoFocus
                />
                <Button onClick={handleMap} disabled={loading || !domain}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Search className="h-4 w-4 mr-1" /> Scan</>}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                {isAddingToExisting
                  ? "Add products from another supplier to this pricebook."
                  : "Foreman will map the site, find product categories, and let you choose what to import."}
              </p>
            </div>
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg border border-destructive/30 bg-destructive/5">
                <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
          </div>
        )}

        {step === "mapping" && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div className="text-center">
              <p className="font-medium">Mapping {domain}...</p>
              <p className="text-sm text-muted-foreground mt-1">
                Discovering product categories. This takes 5-10 seconds.
              </p>
            </div>
          </div>
        )}

        {step === "categories" && (
          <div className="flex flex-col gap-3 min-h-0 overflow-hidden">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {totalProductUrls.toLocaleString()} products in {categories.length} categories
              </p>
              <Button variant="ghost" size="sm" onClick={toggleAllCategories}>
                {selectedCategories.size === categories.length ? "Deselect All" : "Select All"}
              </Button>
            </div>

            <div className="overflow-y-auto flex-1 max-h-[300px] space-y-1.5 pr-1">
              {categories.map((cat) => (
                <label
                  key={cat.name}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedCategories.has(cat.name)
                      ? "border-primary/40 bg-primary/5"
                      : "border-border hover:bg-accent/30"
                  }`}
                >
                  <Checkbox
                    checked={selectedCategories.has(cat.name)}
                    onCheckedChange={() => toggleCategory(cat.name)}
                  />
                  <FolderOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="flex-1 text-sm font-medium">{cat.name}</span>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {cat.count} products
                  </span>
                </label>
              ))}
            </div>

            {/* Config — only show pricebook name/trade when creating new */}
            {!isAddingToExisting && (
              <div className="border-t pt-3 grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Pricebook Name</Label>
                  <Input
                    value={pricebookName}
                    onChange={(e) => setPricebookName(e.target.value)}
                    className="mt-1 h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Trade Type</Label>
                  <Select value={tradeType} onValueChange={setTradeType}>
                    <SelectTrigger className="mt-1 h-9 text-sm">
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
            )}
          </div>
        )}

        {step === "scraping" && (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="w-full max-w-xs space-y-2">
              <Progress
                value={scrapeProgress.total > 0 ? (scrapeProgress.done / scrapeProgress.total) * 100 : 0}
                className="h-2"
              />
              <p className="text-sm text-muted-foreground text-center">
                Scraping {scrapeProgress.done} of {scrapeProgress.total} product pages...
              </p>
              {scrapedProducts.length > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  {scrapedProducts.length} products found so far
                </p>
              )}
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <Package className="h-8 w-8 text-primary animate-pulse" />
            <div className="w-full max-w-xs space-y-2">
              <Progress value={importProgress} className="h-2" />
              <p className="text-sm text-muted-foreground text-center">
                Saving {importCount} of {scrapedProducts.length} products...
              </p>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <CheckCircle2 className="h-10 w-10 text-primary" />
            <p className="font-medium">
              {isAddingToExisting
                ? `${importCount} products added to "${existingPricebook!.name}"`
                : `"${pricebookName}" created`}
            </p>
            <p className="text-sm text-muted-foreground">
              {importCount} product{importCount !== 1 ? "s" : ""} imported successfully
            </p>
          </div>
        )}

        <DialogFooter>
          {step === "domain" && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          )}
          {step === "categories" && (
            <>
              <Button variant="outline" onClick={() => { setStep("domain"); setCategories([]); }}>Back</Button>
              <Button
                onClick={handleScrapeAndImport}
                disabled={selectedCategories.size === 0 || (!isAddingToExisting && !pricebookName)}
              >
                Import {selectedUrlCount.toLocaleString()} Products
              </Button>
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
