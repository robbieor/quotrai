import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCurrency } from "@/hooks/useCurrency";
import { useSupplierSettings } from "@/hooks/useSupplierSettings";

interface ImportFromUrlDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onImport: (product: any) => void;
}

export function ImportFromUrlDialog({ open, onOpenChange, onImport }: ImportFromUrlDialogProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<any>(null);
  const { formatCurrency } = useCurrency();
  const { getSettingForSupplier } = useSupplierSettings();

  const isProductUrl = (u: string): boolean => {
    const lower = u.toLowerCase();
    return lower.includes("/products/") || lower.includes("/product/") || lower.match(/\/[a-z0-9\-]+\.html$/) !== null;
  };

  const handleFetch = async () => {
    if (!url) return;

    const fullUrl = url.startsWith("http") ? url : `https://${url}`;

    if (!isProductUrl(fullUrl)) {
      toast.error("Please paste a specific product page URL, not a homepage. For bulk import, use the Website Import wizard.");
      return;
    }

    setLoading(true);
    setProduct(null);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-supplier-url", {
        body: { url: fullUrl },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.product) throw new Error("No product data returned");

      const p = data.product;
      const setting = getSettingForSupplier(p.supplier_name || "");
      const discount = setting?.discount_percent ?? 0;
      const markup = setting?.default_markup_percent ?? 30;
      const webPrice = p.website_price || 0;
      const costPrice = webPrice > 0 ? +(webPrice * (1 - discount / 100)).toFixed(2) : 0;
      const sellPrice = costPrice > 0 ? +(costPrice * (1 + markup / 100)).toFixed(2) : 0;

      setProduct({
        ...p,
        discount_percent: discount,
        markup_percent: markup,
        cost_price: costPrice,
        sell_price: sellPrice,
      });
    } catch (e: any) {
      toast.error(e.message || "Failed to fetch product");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!product) return;
    onImport({
      item_name: product.product_name,
      supplier_name: product.supplier_name,
      supplier_sku: product.supplier_sku,
      manufacturer: product.manufacturer || null,
      category: product.category || null,
      subcategory: product.subcategory || null,
      trade_type: product.trade_type || "Electrical",
      unit: product.unit_of_measure || "each",
      website_price: product.website_price || null,
      discount_percent: product.discount_percent || 0,
      cost_price: product.cost_price || 0,
      markup_percent: product.markup_percent || 30,
      sell_price: product.sell_price || 0,
      image_url: product.image_url || null,
      source_id: null,
    });
    setProduct(null);
    setUrl("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" /> Import from Supplier URL
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Product URL</Label>
            <div className="flex gap-2 mt-1">
              <Input
                placeholder="https://www.supplier.com/products/example-product"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleFetch()}
              />
              <Button onClick={handleFetch} disabled={loading || !url} size="sm">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Fetch"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Paste a specific product page URL (not a homepage). AI extraction works on any supplier site.</p>
          </div>

          {product && (
            <div className="rounded-xl border border-border p-4 space-y-3 bg-muted/30">
              <div className="flex gap-3">
                {product.image_url && (
                  <img src={product.image_url} alt="" className="w-16 h-16 rounded-lg object-contain bg-background" />
                )}
                <div>
                  <p className="font-medium text-sm">{product.product_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {product.supplier_name} · {product.supplier_sku}
                  </p>
                  {product.manufacturer && (
                    <p className="text-xs text-muted-foreground">Mfr: {product.manufacturer}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Web Price</span>
                  <p className="font-medium">{product.website_price ? formatCurrency(product.website_price) : "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Discount</span>
                  <p className="font-medium">{product.discount_percent}%</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Net Cost</span>
                  <p className="font-medium">{formatCurrency(product.cost_price)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Sell Price</span>
                  <p className="font-semibold">{formatCurrency(product.sell_price)}</p>
                </div>
              </div>

              {product.category && (
                <div className="flex gap-1">
                  <Badge variant="secondary" className="text-[10px]">{product.category}</Badge>
                  {product.subcategory && <Badge variant="outline" className="text-[10px]">{product.subcategory}</Badge>}
                </div>
              )}

              {product.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={!product}>Add to Catalog</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
