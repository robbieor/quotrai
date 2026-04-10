import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ShoppingBag, CheckCircle2 } from "lucide-react";

/**
 * Public Storefront Page
 *
 * Displays products for a connected account and allows customers to purchase them.
 *
 * IMPORTANT: In production, replace the raw Stripe accountId in the URL
 * with a friendlier identifier (e.g., a slug or team name).
 * The accountId is used here for simplicity during development.
 *
 * Route: /storefront/:accountId
 */

interface Product {
  id: string;
  name: string;
  description: string | null;
  default_price: {
    unit_amount: number;
    currency: string;
  } | null;
}

export default function Storefront() {
  // accountId comes from the URL — in production use a slug mapped to the account
  const { accountId } = useParams<{ accountId: string }>();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<string | null>(null);

  const checkoutStatus = searchParams.get("checkout");

  useEffect(() => {
    if (!accountId) return;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("connect-products", {
          body: { action: "list", accountId },
        });
        if (error) throw error;
        setProducts(data?.products || []);
      } catch {
        toast.error("Failed to load products");
      } finally {
        setLoading(false);
      }
    })();
  }, [accountId]);

  const handleBuy = async (product: Product) => {
    if (!accountId || !product.default_price) return;
    setBuyingId(product.id);
    try {
      const { data, error } = await supabase.functions.invoke("connect-checkout", {
        body: {
          accountId,
          productName: product.name,
          unitAmount: product.default_price.unit_amount,
          currency: product.default_price.currency,
          quantity: 1,
        },
      });
      if (error) throw error;
      if (data?.url) {
        // Redirect to Stripe Checkout — the customer pays the connected account directly
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to start checkout");
    } finally {
      setBuyingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 max-w-4xl mx-auto">
      {/* Success banner after checkout */}
      {checkoutStatus === "success" && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 mb-6 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
          <p className="text-sm font-medium text-foreground">
            Payment successful! Thank you for your purchase.
          </p>
        </div>
      )}

      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <ShoppingBag className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Store</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Browse and purchase products
        </p>
      </div>

      {products.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No products available at the moment.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Card key={product.id} className="flex flex-col">
              <CardContent className="py-5 flex flex-col flex-1">
                <h3 className="font-semibold text-foreground">{product.name}</h3>
                {product.description && (
                  <p className="text-sm text-muted-foreground mt-1 flex-1">
                    {product.description}
                  </p>
                )}
                {product.default_price && (
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-lg font-bold text-foreground">
                      €{(product.default_price.unit_amount / 100).toFixed(2)}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => handleBuy(product)}
                      disabled={buyingId === product.id}
                    >
                      {buyingId === product.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Buy Now"
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
