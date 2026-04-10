import { useState, useEffect, useCallback } from "react";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Plus, Package, ExternalLink } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string | null;
  default_price: {
    unit_amount: number;
    currency: string;
  } | null;
}

export default function ConnectProducts() {
  const { profile } = useProfile();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");

  // Fetch the team's Connect account ID
  useEffect(() => {
    if (!profile?.team_id) return;
    (async () => {
      const { data } = await supabase.functions.invoke("stripe-connect", {
        body: { action: "status" },
      });
      if (data?.connected && data?.onboarding_complete) {
        // We need the account ID — fetch from teams table
        const { data: team } = await supabase
          .from("teams")
          .select("stripe_connect_account_id")
          .eq("id", profile.team_id)
          .single();
        if (team?.stripe_connect_account_id) {
          setAccountId(team.stripe_connect_account_id);
        }
      }
      setLoading(false);
    })();
  }, [profile?.team_id]);

  // Fetch products when accountId is available
  const fetchProducts = useCallback(async () => {
    if (!accountId) return;
    try {
      const { data, error } = await supabase.functions.invoke("connect-products", {
        body: { action: "list", accountId },
      });
      if (error) throw error;
      setProducts(data?.products || []);
    } catch (err: any) {
      toast.error("Failed to load products");
    }
  }, [accountId]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId || !name || !price) return;
    setCreating(true);
    try {
      const priceInCents = Math.round(parseFloat(price) * 100);
      if (isNaN(priceInCents) || priceInCents < 1) throw new Error("Invalid price");

      const { error } = await supabase.functions.invoke("connect-products", {
        body: {
          action: "create",
          accountId,
          name,
          description,
          priceInCents,
          currency: "eur",
        },
      });
      if (error) throw error;
      toast.success("Product created");
      setName("");
      setDescription("");
      setPrice("");
      fetchProducts();
    } catch (err: any) {
      toast.error(err.message || "Failed to create product");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!accountId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-8 text-center">
            <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              Complete your payment setup in Settings before managing products.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Products</h1>
          <p className="text-sm text-muted-foreground">
            Manage products for your online storefront
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          {/* TODO: In production, use a friendly slug instead of the raw accountId */}
          <a href={`/storefront/${accountId}`} target="_blank" rel="noopener noreferrer" className="gap-1.5">
            <ExternalLink className="h-3.5 w-3.5" />
            View Storefront
          </a>
        </Button>
      </div>

      {/* Create Product Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Product</CardTitle>
          <CardDescription>Create a new product for customers to purchase</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-3">
            <Input
              placeholder="Product name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <Input
              placeholder="Price (€)"
              type="number"
              step="0.01"
              min="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
            <Button type="submit" disabled={creating} className="gap-1.5">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create Product
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Product List */}
      <div className="space-y-3">
        <h2 className="font-semibold text-foreground">Your Products</h2>
        {products.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No products yet. Create your first one above.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {products.map((product) => (
              <Card key={product.id}>
                <CardContent className="py-4">
                  <h3 className="font-medium text-foreground">{product.name}</h3>
                  {product.description && (
                    <p className="text-sm text-muted-foreground mt-1">{product.description}</p>
                  )}
                  {product.default_price && (
                    <p className="text-sm font-semibold text-primary mt-2">
                      {(product.default_price.unit_amount / 100).toFixed(2)}{" "}
                      {product.default_price.currency.toUpperCase()}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
