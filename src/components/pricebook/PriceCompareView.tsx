import { useState } from "react";
import { Search, TrendingDown, ExternalLink, ArrowUpDown, Loader2, BarChart3 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CompareResult {
  supplier_name: string;
  product_name: string;
  supplier_sku: string;
  manufacturer: string;
  manufacturer_part_number: string | null;
  website_price: number | null;
  image_url: string | null;
  source_url: string | null;
  match_confidence: number;
  match_method: string;
}

interface CompareResponse {
  query: { product_name: string; mpn: string; manufacturer: string };
  results: CompareResult[];
  cheapest: CompareResult | null;
  savings_summary: string;
  total_matches: number;
}

export function PriceCompareView() {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<CompareResponse | null>(null);

  const handleCompare = async () => {
    if (!search.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("compare-products", {
        body: { product_name: search.trim() },
      });
      if (error) throw error;
      setResponse(data);
      if (data.total_matches === 0) {
        toast.info("No matching products found across suppliers");
      }
    } catch (e: any) {
      toast.error(e.message || "Comparison failed");
    } finally {
      setLoading(false);
    }
  };

  const confidenceBadge = (confidence: number) => {
    if (confidence >= 95) return <Badge variant="default" className="text-[10px]">Exact</Badge>;
    if (confidence >= 80) return <Badge variant="secondary" className="text-[10px]">Strong</Badge>;
    return <Badge variant="outline" className="text-[10px]">Partial</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search product name, MPN, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCompare()}
            className="pl-9"
          />
        </div>
        <Button onClick={handleCompare} disabled={loading || !search.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpDown className="h-4 w-4 mr-1.5" />}
          Compare
        </Button>
      </div>

      {/* Empty state */}
      {!response && !loading && (
        <Card>
          <CardContent className="p-8 text-center">
            <BarChart3 className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm font-medium">Compare prices across suppliers</p>
            <p className="text-xs text-muted-foreground mt-1">
              Search for a product to see pricing from all indexed suppliers side-by-side.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {response && response.results.length > 0 && (
        <div className="space-y-3">
          {/* Summary */}
          <div className="flex items-center gap-2 text-sm">
            <TrendingDown className="h-4 w-4 text-green-500" />
            <span className="text-muted-foreground">{response.savings_summary}</span>
            <Badge variant="outline" className="ml-auto text-[10px]">
              {response.total_matches} match{response.total_matches !== 1 ? "es" : ""}
            </Badge>
          </div>

          {/* Product cards */}
          {response.results.map((r, i) => {
            const isCheapest = response.cheapest &&
              r.supplier_name === response.cheapest.supplier_name &&
              r.supplier_sku === response.cheapest.supplier_sku;

            return (
              <Card key={`${r.supplier_name}-${r.supplier_sku}-${i}`} className={isCheapest ? "border-green-500/30 bg-green-500/5" : ""}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start gap-3">
                    {/* Image */}
                    {r.image_url ? (
                      <img src={r.image_url} alt="" className="h-12 w-12 rounded object-cover flex-shrink-0" />
                    ) : (
                      <div className="h-12 w-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                        <BarChart3 className="h-5 w-5 text-muted-foreground/40" />
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium truncate">{r.product_name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="text-xs text-muted-foreground">{r.supplier_name}</span>
                            {r.manufacturer && (
                              <span className="text-xs text-muted-foreground">· {r.manufacturer}</span>
                            )}
                            {r.supplier_sku && (
                              <span className="text-[10px] text-muted-foreground font-mono">SKU: {r.supplier_sku}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {r.website_price ? (
                            <p className={`text-sm font-bold ${isCheapest ? "text-green-600" : ""}`}>
                              €{r.website_price.toFixed(2)}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground">No price</p>
                          )}
                          {isCheapest && <Badge className="text-[9px] bg-green-600 mt-0.5">Cheapest</Badge>}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 mt-1.5">
                        {confidenceBadge(r.match_confidence)}
                        {r.manufacturer_part_number && (
                          <span className="text-[10px] text-muted-foreground font-mono">MPN: {r.manufacturer_part_number}</span>
                        )}
                        {r.source_url && (
                          <a
                            href={r.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-primary hover:underline inline-flex items-center gap-0.5 ml-auto"
                          >
                            View <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {response && response.results.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">No matching products found. Try different search terms.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
