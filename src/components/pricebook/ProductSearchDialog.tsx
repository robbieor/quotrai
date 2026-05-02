import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, ExternalLink, Plus, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCurrency } from "@/hooks/useCurrency";
import { useSupplierSettings } from "@/hooks/useSupplierSettings";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ProductSearchDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onImport: (product: any) => void;
}

interface SearchResult {
  url: string;
  title: string;
  description: string;
}

export function ProductSearchDialog({ open, onOpenChange, onImport }: ProductSearchDialogProps) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [scraping, setScraping] = useState<string | null>(null);
  const [scrapedProduct, setScrapedProduct] = useState<any>(null);
  const { formatCurrency } = useCurrency();
  const { getSettingForSupplier } = useSupplierSettings();

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setResults([]);
    setScrapedProduct(null);

    try {
      const { data, error } = await supabase.functions.invoke("discover-supplier-products", {
        body: { mode: "search", query: query.trim() },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const searchResults: SearchResult[] = (data?.results || []).filter(
        (r: any) => r.url && r.title
      );

      if (searchResults.length === 0) {
        toast.info("No products found. Try different search terms.");
      }

      setResults(searchResults);
    } catch (e: any) {
      toast.error(e.message || "Search failed");
    } finally {
      setSearching(false);
    }
  };

  const handleSelectResult = async (result: SearchResult) => {
    setScraping(result.url);
    setScrapedProduct(null);

    try {
      const { data, error } = await supabase.functions.invoke("scrape-supplier-url", {
        body: { url: result.url },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.product) throw new Error("Could not extract product data from this page");

      const p = data.product;
      const setting = getSettingForSupplier(p.supplier_name || "");
      const discount = setting?.discount_percent ?? 0;
      const markup = setting?.default_markup_percent ?? 30;
      const webPrice = p.website_price || 0;
      const costPrice = webPrice > 0 ? +(webPrice * (1 - discount / 100)).toFixed(2) : 0;
      const sellPrice = costPrice > 0 ? +(costPrice * (1 + markup / 100)).toFixed(2) : 0;

      setScrapedProduct({
        ...p,
        source_url: result.url,
        discount_percent: discount,
        markup_percent: markup,
        cost_price: costPrice,
        sell_price: sellPrice,
      });
    } catch (e: any) {
      toast.error(e.message || "Failed to extract product");
    } finally {
      setScraping(null);
    }
  };

  const handleConfirmImport = () => {
    if (!scrapedProduct) return;
    onImport({
      item_name: scrapedProduct.product_name,
      supplier_name: scrapedProduct.supplier_name,
      supplier_sku: scrapedProduct.supplier_sku,
      manufacturer: scrapedProduct.manufacturer || null,
      category: scrapedProduct.category || null,
      subcategory: scrapedProduct.subcategory || null,
      trade_type: scrapedProduct.trade_type || "Electrical",
      unit: scrapedProduct.unit_of_measure || "each",
      website_price: scrapedProduct.website_price || null,
      discount_percent: scrapedProduct.discount_percent || 0,
      cost_price: scrapedProduct.cost_price || 0,
      markup_percent: scrapedProduct.markup_percent || 30,
      sell_price: scrapedProduct.sell_price || 0,
      image_url: scrapedProduct.image_url || null,
      source_id: null,
    });
    toast.success(`${scrapedProduct.product_name} added to catalog`);
    setScrapedProduct(null);
    setResults([]);
    setQuery("");
  };

  const getDomain = (url: string) => {
    try { return new URL(url).hostname.replace("www.", ""); } catch { return ""; }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" /> Search for a Product
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 min-h-0">
          {/* Search input */}
          <div className="flex gap-2">
            <Input
              placeholder="e.g. Hager MCB 20A Type B or Schneider contactor"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              autoFocus
            />
            <Button onClick={handleSearch} disabled={searching || !query.trim()} size="sm">
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Search by product name, brand, description, or part number. Click a result to pull it in.
          </p>

          {/* Scraped product preview */}
          {scrapedProduct && (
            <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 space-y-3">
              <div className="flex gap-3">
                {scrapedProduct.image_url && (
                  <img src={scrapedProduct.image_url} alt="" className="w-16 h-16 rounded-lg object-contain bg-background border" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{scrapedProduct.product_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {scrapedProduct.supplier_name} · {scrapedProduct.supplier_sku}
                  </p>
                  {scrapedProduct.manufacturer && (
                    <p className="text-xs text-muted-foreground">Mfr: {scrapedProduct.manufacturer}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Web Price</span>
                  <p className="font-medium">{scrapedProduct.website_price ? formatCurrency(scrapedProduct.website_price) : "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Discount</span>
                  <p className="font-medium">{scrapedProduct.discount_percent}%</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Net Cost</span>
                  <p className="font-medium">{formatCurrency(scrapedProduct.cost_price)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Sell Price</span>
                  <p className="font-semibold">{formatCurrency(scrapedProduct.sell_price)}</p>
                </div>
              </div>
              <Button onClick={handleConfirmImport} className="w-full" size="sm">
                <CheckCircle2 className="h-4 w-4 mr-1.5" /> Add to Catalog
              </Button>
            </div>
          )}

          {/* Search results */}
          {results.length > 0 && !scrapedProduct && (
            <ScrollArea className="flex-1 max-h-[380px]">
              <div className="space-y-2 pr-2">
                {results.map((result, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectResult(result)}
                    disabled={scraping !== null}
                    className="w-full text-left rounded-lg border p-3 hover:bg-muted/50 transition-colors disabled:opacity-50 space-y-1"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium line-clamp-1">{result.title}</p>
                      {scraping === result.url ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                      ) : (
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      )}
                    </div>
                    {result.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{result.description}</p>
                    )}
                    <Badge variant="outline" className="text-[10px]">{getDomain(result.url)}</Badge>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Empty state */}
          {!searching && results.length === 0 && !scrapedProduct && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Search for any product across the web — Foreman will extract the details for you.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
