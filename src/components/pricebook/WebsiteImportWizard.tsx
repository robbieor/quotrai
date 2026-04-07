import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, Globe, CheckCircle2, Search, Package, AlertCircle, FolderOpen, ChevronRight, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSupplierSettings } from "@/hooks/useSupplierSettings";
import { usePricebooks, type Pricebook } from "@/hooks/usePricebooks";
import { useProfile } from "@/hooks/useProfile";
import { getAllTradeTypes } from "@/data/tradeCategoryMap";
import { ScrollArea } from "@/components/ui/scroll-area";

interface WebsiteImportWizardProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onComplete: (pricebook: Pricebook) => void;
  existingPricebook?: Pricebook | null;
}

type Step = "domain" | "mapping" | "families" | "scraping" | "importing" | "done";

interface SubFamily {
  name: string;
  count: number;
  urls: string[];
}

interface ProductFamily {
  name: string;
  count: number;
  urls: string[];
  subfamilies: SubFamily[];
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

  // Family hierarchy
  const [families, setFamilies] = useState<ProductFamily[]>([]);
  const [selectedFamilies, setSelectedFamilies] = useState<Set<string>>(new Set());
  const [expandedFamily, setExpandedFamily] = useState<string | null>(null);
  const [selectedSubfamilies, setSelectedSubfamilies] = useState<Map<string, Set<string>>>(new Map());
  const [totalProductUrls, setTotalProductUrls] = useState(0);

  // Search
  const [familySearch, setFamilySearch] = useState("");
  const [subfamilySearch, setSubfamilySearch] = useState("");

  // Scrape phase
  const [scrapedProducts, setScrapedProducts] = useState<ScrapedProduct[]>([]);
  const [scrapeProgress, setScrapeProgress] = useState({ done: 0, total: 0 });

  // Config
  const [pricebookName, setPricebookName] = useState("");
  const [tradeType, setTradeType] = useState(existingPricebook?.trade_type || "Electrical");

  const [importProgress, setImportProgress] = useState(0);
  const [importCount, setImportCount] = useState(0);

  const { getSettingForSupplier } = useSupplierSettings();
  const { createPricebook, updateItemCount } = usePricebooks();
  const { profile } = useProfile();

  const isAddingToExisting = !!existingPricebook;

  // Filtered families
  const filteredFamilies = useMemo(() => {
    if (!familySearch) return families;
    const q = familySearch.toLowerCase();
    return families.filter((f) => f.name.toLowerCase().includes(q));
  }, [families, familySearch]);

  // Filtered subfamilies for expanded family
  const filteredSubfamilies = useMemo(() => {
    if (!expandedFamily) return [];
    const family = families.find((f) => f.name === expandedFamily);
    if (!family) return [];
    if (!subfamilySearch) return family.subfamilies;
    const q = subfamilySearch.toLowerCase();
    return family.subfamilies.filter((s) => s.name.toLowerCase().includes(q));
  }, [families, expandedFamily, subfamilySearch]);

  // Count selected URLs
  const selectedUrlCount = useMemo(() => {
    let total = 0;
    for (const family of families) {
      if (selectedFamilies.has(family.name)) {
        const subs = selectedSubfamilies.get(family.name);
        if (!subs || subs.size === 0 || subs.size === family.subfamilies.length) {
          total += family.count;
        } else {
          for (const sub of family.subfamilies) {
            if (subs.has(sub.name)) total += sub.count;
          }
        }
      }
    }
    return total;
  }, [families, selectedFamilies, selectedSubfamilies]);

  const reset = () => {
    setStep("domain");
    setDomain("");
    setFamilies([]);
    setSelectedFamilies(new Set());
    setExpandedFamily(null);
    setSelectedSubfamilies(new Map());
    setTotalProductUrls(0);
    setScrapedProducts([]);
    setScrapeProgress({ done: 0, total: 0 });
    setPricebookName("");
    setTradeType(existingPricebook?.trade_type || "Electrical");
    setImportProgress(0);
    setImportCount(0);
    setError("");
    setLoading(false);
    setFamilySearch("");
    setSubfamilySearch("");
  };

  const detectSupplierName = (d: string): string => {
    const lower = d.toLowerCase();
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

      const fams: ProductFamily[] = data?.families || [];
      setFamilies(fams);
      setTotalProductUrls(data?.total_product_urls || 0);

      if (fams.length === 0) {
        setError("No product pages found. Try a different supplier domain.");
        setStep("domain");
      } else {
        setSelectedFamilies(new Set(fams.map((f) => f.name)));
        if (!isAddingToExisting) {
          const supplier = detectSupplierName(domain);
          setPricebookName(`${supplier} Pricebook`);
        }
        setStep("families");
      }
    } catch (e: any) {
      setError(e.message || "Mapping failed");
      setStep("domain");
      toast.error(e.message || "Mapping failed");
    } finally {
      setLoading(false);
    }
  };

  const toggleFamily = (name: string) => {
    setSelectedFamilies((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
        // Clear subfamily selections
        setSelectedSubfamilies((prev) => {
          const n = new Map(prev);
          n.delete(name);
          return n;
        });
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const toggleSubfamily = (familyName: string, subName: string) => {
    setSelectedSubfamilies((prev) => {
      const n = new Map(prev);
      const current = n.get(familyName) || new Set<string>();
      const next = new Set(current);
      if (next.has(subName)) next.delete(subName);
      else next.add(subName);
      n.set(familyName, next);

      // If all subs selected or none, ensure family is toggled accordingly
      const family = families.find((f) => f.name === familyName);
      if (family && next.size === 0) {
        setSelectedFamilies((sf) => {
          const s = new Set(sf);
          s.delete(familyName);
          return s;
        });
      } else if (!selectedFamilies.has(familyName)) {
        setSelectedFamilies((sf) => new Set([...sf, familyName]));
      }
      return n;
    });
  };

  const toggleAllFamilies = () => {
    if (selectedFamilies.size === families.length) {
      setSelectedFamilies(new Set());
      setSelectedSubfamilies(new Map());
    } else {
      setSelectedFamilies(new Set(families.map((f) => f.name)));
      setSelectedSubfamilies(new Map());
    }
  };

  const expandFamily = (name: string) => {
    setExpandedFamily(expandedFamily === name ? null : name);
    setSubfamilySearch("");
  };

  const getSelectedUrlsForFamily = (family: ProductFamily): string[] => {
    const subs = selectedSubfamilies.get(family.name);
    if (!subs || subs.size === 0) return family.urls; // All selected
    return family.subfamilies
      .filter((s) => subs.has(s.name))
      .flatMap((s) => s.urls);
  };

  const handleScrapeAndImport = async () => {
    if (!profile?.team_id || selectedFamilies.size === 0) return;
    setStep("scraping");
    setLoading(true);

    try {
      const allUrls = families
        .filter((f) => selectedFamilies.has(f.name))
        .flatMap((f) => getSelectedUrlsForFamily(f));

      const BATCH_SIZE = 30;
      const totalToScrape = allUrls.length;
      const totalBatches = Math.ceil(totalToScrape / BATCH_SIZE);
      setScrapeProgress({ done: 0, total: totalToScrape });

      const allProducts: ScrapedProduct[] = [];
      for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
        const offset = batchIdx * BATCH_SIZE;
        const batch = allUrls.slice(offset, offset + BATCH_SIZE);

        const { data, error: fnErr } = await supabase.functions.invoke("discover-supplier-products", {
          body: { mode: "scrape", urls: batch },
        });

        if (fnErr) { console.error("Batch scrape error:", fnErr); continue; }

        const products: ScrapedProduct[] = data?.products || [];
        allProducts.push(...products);
        const done = Math.min(offset + batch.length, totalToScrape);
        setScrapeProgress({ done, total: totalToScrape });
        setScrapedProducts([...allProducts]);
      }

      if (allProducts.length === 0) {
        toast.error("No products could be scraped. Try different families.");
        setStep("families");
        setLoading(false);
        return;
      }

      setStep("importing");

      const supplier = detectSupplierName(domain);
      let pricebookId: string;

      if (isAddingToExisting) {
        pricebookId = existingPricebook!.id;
      } else {
        const pb = await createPricebook.mutateAsync({
          name: pricebookName,
          supplier_name: null,
          source_type: "website",
          source_url: domain.startsWith("http") ? domain : `https://${domain}`,
          trade_type: tradeType,
          last_synced_at: new Date().toISOString(),
        });
        pricebookId = (pb as any)?.id;
      }

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

      if (!isAddingToExisting) {
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
      setStep("families");
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
            <Globe className="h-5 w-5 text-primary" />
            {step === "domain" && title}
            {step === "mapping" && "Scanning Supplier..."}
            {step === "families" && "Select Product Families"}
            {step === "scraping" && "Scraping Products..."}
            {step === "importing" && "Importing Products..."}
            {step === "done" && "Import Complete"}
          </DialogTitle>
        </DialogHeader>

        {/* ── DOMAIN STEP ── */}
        {step === "domain" && (
          <div className="space-y-4">
            <div>
              <Label>Supplier Domain</Label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  placeholder="e.g. supplier.com, distributor.ie"
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
                  : "Foreman will map the site, find product families, and let you choose what to import."}
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

        {/* ── MAPPING STEP ── */}
        {step === "mapping" && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div className="text-center">
              <p className="font-medium">Mapping {domain}...</p>
              <p className="text-sm text-muted-foreground mt-1">Discovering product families. This takes 5-10 seconds.</p>
            </div>
          </div>
        )}

        {/* ── FAMILIES STEP (two-level drill-down) ── */}
        {step === "families" && (
          <div className="flex flex-col gap-3 min-h-0 overflow-hidden">
            {/* Stats bar */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {totalProductUrls.toLocaleString()} products in {families.length} families
              </p>
              <Button variant="ghost" size="sm" onClick={toggleAllFamilies}>
                {selectedFamilies.size === families.length ? "Deselect All" : "Select All"}
              </Button>
            </div>

            {/* Two-column layout: Families | Subfamilies */}
            <div className="flex gap-3 min-h-0 flex-1">
              {/* Left: Product Families */}
              <div className="flex-1 flex flex-col min-w-0 border rounded-lg overflow-hidden">
                <div className="p-2 border-b bg-muted/30">
                  <div className="relative">
                    <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search families..."
                      value={familySearch}
                      onChange={(e) => setFamilySearch(e.target.value)}
                      className="pl-7 h-8 text-xs"
                    />
                  </div>
                </div>
                <ScrollArea className="flex-1 max-h-[280px]">
                  <div className="p-1 space-y-0.5">
                    {filteredFamilies.map((family) => (
                      <div
                        key={family.name}
                        className={`flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer transition-colors text-sm ${
                          expandedFamily === family.name
                            ? "bg-primary/10 border border-primary/30"
                            : selectedFamilies.has(family.name)
                            ? "bg-accent/50 hover:bg-accent"
                            : "hover:bg-accent/30"
                        }`}
                      >
                        <Checkbox
                          checked={selectedFamilies.has(family.name)}
                          onCheckedChange={() => toggleFamily(family.name)}
                          className="flex-shrink-0"
                        />
                        <button
                          className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
                          onClick={() => expandFamily(family.name)}
                        >
                          {expandedFamily === family.name ? (
                            <ChevronDown className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          )}
                          <span className="truncate font-medium">{family.name}</span>
                        </button>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 flex-shrink-0">
                          {family.count}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Right: Subfamilies (shown when a family is expanded) */}
              <div className="flex-1 flex flex-col min-w-0 border rounded-lg overflow-hidden">
                {expandedFamily ? (
                  <>
                    <div className="p-2 border-b bg-muted/30">
                      <p className="text-xs font-medium text-foreground mb-1.5 truncate">{expandedFamily}</p>
                      <div className="relative">
                        <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Search products..."
                          value={subfamilySearch}
                          onChange={(e) => setSubfamilySearch(e.target.value)}
                          className="pl-7 h-8 text-xs"
                        />
                      </div>
                    </div>
                    <ScrollArea className="flex-1 max-h-[280px]">
                      <div className="p-1 space-y-0.5">
                        {filteredSubfamilies.map((sub) => {
                          const familySubs = selectedSubfamilies.get(expandedFamily) || new Set();
                          const isSelected = familySubs.size === 0
                            ? selectedFamilies.has(expandedFamily)
                            : familySubs.has(sub.name);

                          return (
                            <label
                              key={sub.name}
                              className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors text-sm ${
                                isSelected ? "bg-primary/5" : "hover:bg-accent/30"
                              }`}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleSubfamily(expandedFamily, sub.name)}
                                className="flex-shrink-0"
                              />
                              <span className="flex-1 truncate text-xs">{sub.name}</span>
                              <span className="text-[10px] text-muted-foreground flex-shrink-0">{sub.count}</span>
                            </label>
                          );
                        })}
                        {filteredSubfamilies.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-4">No matches</p>
                        )}
                      </div>
                    </ScrollArea>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground p-4 text-center">
                    <div>
                      <FolderOpen className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                      <p>Click a product family to browse subcategories</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Config — only show when creating new */}
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
                    <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
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

        {/* ── SCRAPING STEP ── */}
        {step === "scraping" && (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="w-full max-w-xs space-y-2">
              <Progress
                value={scrapeProgress.total > 0 ? (scrapeProgress.done / scrapeProgress.total) * 100 : 0}
                className="h-2"
              />
              <p className="text-sm text-muted-foreground text-center">
                {scrapeProgress.done === 0
                  ? "Preparing first batch..."
                  : `Scraped ${scrapeProgress.done} of ${scrapeProgress.total} pages`}
              </p>
              {scrapedProducts.length > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  {scrapedProducts.length} products extracted so far
                </p>
              )}
              {scrapeProgress.total > 100 && scrapeProgress.done === 0 && (
                <p className="text-xs text-muted-foreground text-center mt-1">
                  Large import — this may take a few minutes
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── IMPORTING STEP ── */}
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

        {/* ── DONE STEP ── */}
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
          {step === "families" && (
            <>
              <Button variant="outline" onClick={() => { setStep("domain"); setFamilies([]); }}>Back</Button>
              <Button
                onClick={handleScrapeAndImport}
                disabled={selectedFamilies.size === 0 || (!isAddingToExisting && !pricebookName)}
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
