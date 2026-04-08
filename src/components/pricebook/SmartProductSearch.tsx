import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Plus, CheckCircle2, X, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCurrency } from "@/hooks/useCurrency";
import { useSupplierSettings } from "@/hooks/useSupplierSettings";

interface SmartProductSearchProps {
  onImport: (product: any) => void;
}

interface SearchResult {
  url: string;
  title: string;
  description: string;
}

const URL_PATTERN = /^https?:\/\/|(\.(com|ie|co\.uk|net|org|eu|shop|store))/i;

function isUrl(input: string): boolean {
  return URL_PATTERN.test(input.trim());
}

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace("www.", ""); } catch { return ""; }
}

export function SmartProductSearch({ onImport }: SmartProductSearchProps) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [scrapingUrl, setScrapingUrl] = useState<string | null>(null);
  const [addedUrls, setAddedUrls] = useState<Set<string>>(new Set());
  const [urlPreview, setUrlPreview] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);
  const { formatCurrency } = useCurrency();
  const { getSettingForSupplier } = useSupplierSettings();
  const inputRef = useRef<HTMLInputElement>(null);

  const applyPricing = (p: any) => {
    const setting = getSettingForSupplier(p.supplier_name || "");
    const discount = setting?.discount_percent ?? 0;
    const markup = setting?.default_markup_percent ?? 30;
    const webPrice = p.website_price || 0;
    const costPrice = webPrice > 0 ? +(webPrice * (1 - discount / 100)).toFixed(2) : 0;
    const sellPrice = costPrice > 0 ? +(costPrice * (1 + markup / 100)).toFixed(2) : 0;
    return {
      item_name: p.product_name,
      supplier_name: p.supplier_name,
      supplier_sku: p.supplier_sku,
      manufacturer: p.manufacturer || null,
      category: p.category || null,
      subcategory: p.subcategory || null,
      trade_type: p.trade_type || "Electrical",
      unit: p.unit_of_measure || "each",
      website_price: p.website_price || null,
      discount_percent: discount,
      cost_price: costPrice,
      markup_percent: markup,
      sell_price: sellPrice,
      image_url: p.image_url || null,
      source_id: null,
    };
  };

  const handleSubmit = async () => {
    const q = query.trim();
    if (!q) return;

    setShowResults(true);
    setUrlPreview(null);

    if (isUrl(q)) {
      // Direct URL scrape
      setScrapingUrl(q);
      try {
        const url = q.startsWith("http") ? q : `https://${q}`;
        const { data, error } = await supabase.functions.invoke("scrape-supplier-url", {
          body: { url },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        if (!data?.product) throw new Error("Could not extract product data");
        setUrlPreview({ ...data.product, source_url: url });
      } catch (e: any) {
        toast.error(e.message || "Failed to fetch product");
      } finally {
        setScrapingUrl(null);
      }
    } else {
      // Text search
      setSearching(true);
      setResults([]);
      try {
        const { data, error } = await supabase.functions.invoke("discover-supplier-products", {
          body: { mode: "search", query: q },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        const r: SearchResult[] = (data?.results || []).filter((x: any) => x.url && x.title);
        if (r.length === 0) toast.info("No products found. Try different terms.");
        setResults(r);
      } catch (e: any) {
        toast.error(e.message || "Search failed");
      } finally {
        setSearching(false);
      }
    }
  };

  const handleAddFromUrl = (product: any) => {
    const payload = applyPricing(product);
    onImport(payload);
    toast.success(`${payload.item_name} added`);
    setUrlPreview(null);
    setQuery("");
    setShowResults(false);
  };

  const handleAddResult = async (result: SearchResult) => {
    setScrapingUrl(result.url);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-supplier-url", {
        body: { url: result.url },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.product) throw new Error("Could not extract product data");

      const payload = applyPricing(data.product);
      onImport(payload);
      setAddedUrls((prev) => new Set(prev).add(result.url));
      toast.success(`${payload.item_name} added`);
    } catch (e: any) {
      toast.error(e.message || "Failed to add product");
    } finally {
      setScrapingUrl(null);
    }
  };

  const dismiss = () => {
    setShowResults(false);
    setResults([]);
    setUrlPreview(null);
    setQuery("");
    setAddedUrls(new Set());
  };

  return (
    <div className="space-y-2">
      {/* Input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            placeholder="Search products or paste a URL..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            className="pl-9 pr-8"
          />
          {query && (
            <button onClick={dismiss} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button onClick={handleSubmit} disabled={searching || !!scrapingUrl || !query.trim()} size="sm" className="shrink-0">
          {searching || scrapingUrl ? <Loader2 className="h-4 w-4 animate-spin" /> : "Go"}
        </Button>
      </div>

      {/* URL preview */}
      {showResults && urlPreview && (
        <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-3 space-y-2">
          <div className="flex items-start gap-3">
            {urlPreview.image_url && (
              <img src={urlPreview.image_url} alt="" className="w-12 h-12 rounded-lg object-contain bg-background border shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{urlPreview.product_name}</p>
              <p className="text-xs text-muted-foreground">{urlPreview.supplier_name} · {urlPreview.supplier_sku}</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {urlPreview.website_price ? formatCurrency(urlPreview.website_price) : "No price"}
            </span>
            <Button size="sm" className="h-7 text-xs" onClick={() => handleAddFromUrl(urlPreview)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add to Pricebook
            </Button>
          </div>
        </div>
      )}

      {/* Scraping a URL */}
      {showResults && scrapingUrl && !urlPreview && results.length === 0 && (
        <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Fetching product details...
        </div>
      )}

      {/* Search results */}
      {showResults && results.length > 0 && (
        <div className="space-y-1.5 max-h-[360px] overflow-y-auto">
          {results.map((result, idx) => {
            const added = addedUrls.has(result.url);
            const loading = scrapingUrl === result.url;
            return (
              <div
                key={idx}
                className="flex items-center gap-2 rounded-lg border p-2.5 hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-1">{result.title}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge variant="outline" className="text-[10px] shrink-0">{getDomain(result.url)}</Badge>
                    {result.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-1">{result.description}</p>
                    )}
                  </div>
                </div>
                {added ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 shrink-0"
                    disabled={!!scrapingUrl}
                    onClick={() => handleAddResult(result)}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Searching spinner */}
      {showResults && searching && (
        <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Searching the web...
        </div>
      )}
    </div>
  );
}
