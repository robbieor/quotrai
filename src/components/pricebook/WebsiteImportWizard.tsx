import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Loader2, Globe, CheckCircle2, Search, Package, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSupplierSettings } from "@/hooks/useSupplierSettings";
import { usePricebooks, type Pricebook } from "@/hooks/usePricebooks";
import { useTeamCatalog } from "@/hooks/useTeamCatalog";
import { useProfile } from "@/hooks/useProfile";
import { getAllTradeTypes } from "@/data/tradeCategoryMap";

interface WebsiteImportWizardProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onComplete: (pricebook: Pricebook) => void;
}

type Step = "domain" | "discovering" | "select" | "configure" | "importing" | "done";

interface ScrapedProduct {
  product_name: string;
  supplier_name: string;
  supplier_sku: string;
  website_price: number | null;
  image_url?: string;
  category?: string;
  subcategory?: string;
  manufacturer?: string;
  description?: string;
  unit_of_measure?: string;
  source_url?: string;
}

export function WebsiteImportWizard({ open, onOpenChange, onComplete }: WebsiteImportWizardProps) {
  const [step, setStep] = useState<Step>("domain");
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [discoveredProducts, setDiscoveredProducts] = useState<ScrapedProduct[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [urlsFound, setUrlsFound] = useState(0);
  const [productUrlsFound, setProductUrlsFound] = useState(0);
  const [discoveryError, setDiscoveryError] = useState("");

  // Configure step
  const [pricebookName, setPricebookName] = useState("");
  const [tradeType, setTradeType] = useState("Electrical");

  // Import progress
  const [importProgress, setImportProgress] = useState(0);
  const [importCount, setImportCount] = useState(0);

  const { getSettingForSupplier } = useSupplierSettings();
  const { createPricebook, updateItemCount } = usePricebooks();
  const { addItem } = useTeamCatalog();
  const { profile } = useProfile();

  const reset = () => {
    setStep("domain");
    setDomain("");
    setDiscoveredProducts([]);
    setSelectedIndices(new Set());
    setUrlsFound(0);
    setProductUrlsFound(0);
    setDiscoveryError("");
    setPricebookName("");
    setTradeType("Electrical");
    setImportProgress(0);
    setImportCount(0);
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

  const handleDiscover = async () => {
    if (!domain) return;
    setLoading(true);
    setDiscoveryError("");
    setStep("discovering");

    try {
      const { data, error } = await supabase.functions.invoke("discover-supplier-products", {
        body: { domain: domain.trim(), limit: 20 },
      });

      if (error) throw new Error(error.message || "Discovery failed");

      const products: ScrapedProduct[] = data?.products || [];
      setDiscoveredProducts(products);
      setUrlsFound(data?.urls_found || 0);
      setProductUrlsFound(data?.product_urls_found || 0);

      if (products.length === 0) {
        setDiscoveryError(data?.error || "No products found. Try a different supplier domain.");
        setStep("domain");
      } else {
        // Select all by default
        setSelectedIndices(new Set(products.map((_: ScrapedProduct, i: number) => i)));
        const supplier = detectSupplierName(domain);
        setPricebookName(`${supplier} Pricebook`);
        setStep("select");
      }
    } catch (e: any) {
      setDiscoveryError(e.message || "Discovery failed");
      setStep("domain");
      toast.error("Discovery failed: " + (e.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const toggleProduct = (idx: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIndices.size === discoveredProducts.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(discoveredProducts.map((_, i) => i)));
    }
  };

  const handleImport = async () => {
    if (!profile?.team_id || selectedIndices.size === 0) return;
    setStep("importing");
    setLoading(true);

    try {
      const supplier = detectSupplierName(domain);
      const pb = await createPricebook.mutateAsync({
        name: pricebookName,
        supplier_name: supplier,
        source_type: "website",
        source_url: domain.startsWith("http") ? domain : `https://${domain}`,
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

      const selected = Array.from(selectedIndices).map((i) => discoveredProducts[i]);
      let imported = 0;

      for (let i = 0; i < selected.length; i++) {
        const product = selected[i];
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
            trade_type: tradeType,
            unit: product.unit_of_measure || "each",
            website_price: webPrice || null,
            discount_percent: discount,
            cost_price: costPrice,
            markup_percent: markup,
            sell_price: sellPrice,
            image_url: product.image_url || null,
          });

        if (!itemErr) imported++;
        setImportProgress(Math.round(((i + 1) / selected.length) * 100));
        setImportCount(imported);
      }

      // Update import job
      if (jobId) {
        await supabase
          .from("pricebook_import_jobs" as any)
          .update({
            status: "completed",
            items_found: selected.length,
            items_imported: imported,
            items_failed: selected.length - imported,
            completed_at: new Date().toISOString(),
          })
          .eq("id", jobId);
      }

      if (pricebookId) await updateItemCount(pricebookId);

      setStep("done");
      if (pb) onComplete(pb as unknown as Pricebook);
    } catch (e: any) {
      toast.error(e.message || "Import failed");
      setStep("select");
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number | null) => {
    if (!price) return "—";
    return `€${price.toFixed(2)}`;
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {step === "domain" && "Import from Supplier Website"}
            {step === "discovering" && "Scanning Supplier..."}
            {step === "select" && `Select Products (${selectedIndices.size}/${discoveredProducts.length})`}
            {step === "configure" && "Configure Import"}
            {step === "importing" && "Importing Products..."}
            {step === "done" && "Import Complete"}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Enter domain */}
        {step === "domain" && (
          <div className="space-y-4">
            <div>
              <Label>Supplier Domain</Label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  placeholder="e.g. wesco.ie"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleDiscover()}
                  autoFocus
                />
                <Button onClick={handleDiscover} disabled={loading || !domain}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Search className="h-4 w-4 mr-1" /> Scan</>}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                Enter a supplier domain. Foreman will automatically discover and scrape product pages.
              </p>
            </div>

            {discoveryError && (
              <div className="flex items-start gap-2 p-3 rounded-lg border border-destructive/30 bg-destructive/5">
                <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{discoveryError}</p>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Discovering */}
        {step === "discovering" && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div className="text-center">
              <p className="font-medium">Scanning {domain}...</p>
              <p className="text-sm text-muted-foreground mt-1">
                Mapping site structure and scraping product pages. This may take 30-60 seconds.
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Select products */}
        {step === "select" && (
          <div className="flex flex-col gap-3 min-h-0 overflow-hidden">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Found {productUrlsFound} product pages · {discoveredProducts.length} products scraped
              </p>
              <Button variant="ghost" size="sm" onClick={toggleAll}>
                {selectedIndices.size === discoveredProducts.length ? "Deselect All" : "Select All"}
              </Button>
            </div>

            <div className="overflow-y-auto flex-1 max-h-[400px] space-y-2 pr-1">
              {discoveredProducts.map((product, idx) => (
                <label
                  key={idx}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedIndices.has(idx)
                      ? "border-primary/40 bg-primary/5"
                      : "border-border hover:bg-accent/30"
                  }`}
                >
                  <Checkbox
                    checked={selectedIndices.has(idx)}
                    onCheckedChange={() => toggleProduct(idx)}
                    className="mt-1"
                  />
                  {product.image_url && (
                    <img
                      src={product.image_url}
                      alt=""
                      className="w-12 h-12 object-contain rounded border border-border bg-white flex-shrink-0"
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{product.product_name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      {product.supplier_sku && <span>{product.supplier_sku}</span>}
                      {product.category && <span>· {product.category}</span>}
                      {product.manufacturer && <span>· {product.manufacturer}</span>}
                    </div>
                  </div>
                  <span className="text-sm font-semibold whitespace-nowrap">
                    {formatPrice(product.website_price)}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Configure */}
        {step === "configure" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex items-center gap-3">
              <Package className="h-5 w-5 text-primary flex-shrink-0" />
              <p className="text-sm">
                <span className="font-medium">{selectedIndices.size} products</span> selected for import
              </p>
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
          </div>
        )}

        {/* Step 5: Importing */}
        {step === "importing" && (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="w-full max-w-xs space-y-2">
              <Progress value={importProgress} className="h-2" />
              <p className="text-sm text-muted-foreground text-center">
                Importing {importCount} of {selectedIndices.size} products...
              </p>
            </div>
          </div>
        )}

        {/* Step 6: Done */}
        {step === "done" && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
            <p className="font-medium">"{pricebookName}" created</p>
            <p className="text-sm text-muted-foreground">
              {importCount} product{importCount !== 1 ? "s" : ""} imported successfully
            </p>
          </div>
        )}

        <DialogFooter>
          {step === "domain" && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          )}
          {step === "select" && (
            <>
              <Button variant="outline" onClick={() => { setStep("domain"); setDiscoveredProducts([]); }}>Back</Button>
              <Button onClick={() => setStep("configure")} disabled={selectedIndices.size === 0}>
                Next · {selectedIndices.size} selected
              </Button>
            </>
          )}
          {step === "configure" && (
            <>
              <Button variant="outline" onClick={() => setStep("select")}>Back</Button>
              <Button onClick={handleImport} disabled={!pricebookName}>
                Create & Import
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
