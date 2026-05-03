import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Plus, CheckCircle2, X, ChevronLeft } from "lucide-react";
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

interface ScrapedPreview {
  raw: any;
  pricing: {
    item_name: string;
    supplier_name: string | null;
    supplier_sku: string | null;
    manufacturer: string | null;
    category: string | null;
    subcategory: string | null;
    trade_type: string;
    unit: string;
    website_price: number | null;
    discount_percent: number;
    cost_price: number;
    markup_percent: number;
    sell_price: number;
    image_url: string | null;
    source_id: null;
  };
  margin: number;
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
  const [preview, setPreview] = useState<ScrapedPreview | null>(null);
  const [showResults, setShowResults] = useState(false);
  const { formatCurrency } = useCurrency();
  const { getSettingForSupplier } = useSupplierSettings();
  const inputRef = useRef<HTMLInputElement>(null);

  const buildPreview = (p: any): ScrapedPreview => {
    const setting = getSettingForSupplier(p.supplier_name || "");
    const discount = setting?.discount_percent ?? 0;
    const markup = setting?.default_markup_percent ?? 30;
    const webPrice = p.website_price || 0;
    const costPrice = webPrice > 0 ? +(webPrice * (1 - discount / 100)).toFixed(2) : 0;
    const sellPrice = costPrice > 0 ? +(costPrice * (1 + markup / 100)).toFixed(2) : 0;
    const margin = sellPrice > 0 ? +((sellPrice - costPrice) / sellPrice * 100).toFixed(1) : 0;

    return {
      raw: p,
      pricing: {
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
      },
      margin,
    };
  };

  const handleSubmit = async () => {
    const q = query.trim();
    if (!q) return;

    setShowResults(true);
    setPreview(null);

    if (isUrl(q)) {
      setScrapingUrl(q);
      try {
        const url = q.startsWith("http") ? q : `https://${q}`;
        const { data, error } = await supabase.functions.invoke("scrape-supplier-url", {
          body: { url },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        if (!data?.product) throw new Error("Could not extract product data");
        setPreview(buildPreview({ ...data.product, source_url: url }));
      } catch (e: any) {
        toast.error(e.message || "Failed to fetch product");
      } finally {
        setScrapingUrl(null);
      }
    } else {
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

  const handleSelectResult = async (result: SearchResult) => {
    setScrapingUrl(result.url);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-supplier-url", {
        body: { url: result.url },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.product) throw new Error("Could not extract product data");
      setPreview(buildPreview(data.product));
    } catch (e: any) {
      toast.error(e.message || "Failed to fetch product details");
    } finally {
      setScrapingUrl(null);
    }
  };

  const handleConfirmAdd = () => {
    if (!preview) return;
    onImport(preview.pricing);
    toast.success(`${preview.pricing.item_name} added`);
    setAddedUrls((prev) => new Set(prev).add(preview.raw.source_url || ""));
    setPreview(null);
  };

  const dismiss = () => {
    setShowResults(false);
    setResults([]);
    setPreview(null);
    setQuery("");
    setAddedUrls(new Set());
  };

  const marginColor = (m: number) =>
    m >= 30 ? "text-primary dark:text-primary" :
    m >= 15 ? "text-amber-600 dark:text-amber-400" :
    "text-destructive";

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

      {/* Product preview card — shown after clicking a result or pasting URL */}
      {showResults && preview && (
        <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-3 space-y-3">
          {/* Back to results */}
          {results.length > 0 && (
            <button
              onClick={() => setPreview(null)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-3 w-3" /> Back to results
            </button>
          )}

          {/* Product info */}
          <div className="flex items-start gap-3">
            {preview.raw.image_url && (
              <img src={preview.raw.image_url} alt="" className="w-14 h-14 rounded-lg object-contain bg-background border shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm leading-tight">{preview.pricing.item_name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {preview.pricing.supplier_name}{preview.pricing.supplier_sku ? ` · ${preview.pricing.supplier_sku}` : ""}
              </p>
              {preview.pricing.manufacturer && (
                <p className="text-xs text-muted-foreground">Mfr: {preview.pricing.manufacturer}</p>
              )}
            </div>
          </div>

          {/* Pricing breakdown */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs bg-background/60 rounded-lg p-2.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Web Price</span>
              <span className="font-medium">{preview.pricing.website_price ? formatCurrency(preview.pricing.website_price) : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount</span>
              <span className="font-medium">{preview.pricing.discount_percent}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Your Cost</span>
              <span className="font-semibold">{formatCurrency(preview.pricing.cost_price)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Markup</span>
              <span className="font-medium">{preview.pricing.markup_percent}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sell Price</span>
              <span className="font-semibold">{formatCurrency(preview.pricing.sell_price)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Margin</span>
              <span className={`font-bold ${marginColor(preview.margin)}`}>{preview.margin}%</span>
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground">
            Client invoices show the sell price only — your cost and margin stay private.
          </p>

          <Button size="sm" className="w-full" onClick={handleConfirmAdd}>
            <CheckCircle2 className="h-4 w-4 mr-1.5" /> Add to Pricebook
          </Button>
        </div>
      )}

      {/* Loading spinner for URL/scrape */}
      {showResults && scrapingUrl && !preview && results.length === 0 && (
        <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Fetching product details...
        </div>
      )}

      {/* Search results list */}
      {showResults && results.length > 0 && !preview && (
        <div className="space-y-1.5 max-h-[360px] overflow-y-auto">
          {results.map((result, idx) => {
            const added = addedUrls.has(result.url);
            const loading = scrapingUrl === result.url;
            return (
              <button
                key={idx}
                onClick={() => !added && !scrapingUrl && handleSelectResult(result)}
                disabled={!!scrapingUrl || added}
                className="w-full text-left flex items-center gap-2 rounded-lg border p-2.5 hover:bg-muted/50 transition-colors disabled:opacity-60"
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
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                ) : loading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                ) : (
                  <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </button>
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
