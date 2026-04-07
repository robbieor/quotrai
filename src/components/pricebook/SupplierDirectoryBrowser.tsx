import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Globe, Upload, BookOpen, Sparkles, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";

interface Supplier {
  id: string;
  supplier_name: string;
  domain: string | null;
  country_code: string;
  trade_types: string[];
  is_scrapeable: boolean;
  product_count: number;
  status: string;
}

interface SupplierDirectoryBrowserProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSelectSupplier: (supplier: Supplier, method: "catalog" | "csv" | "manual" | "ai_extract") => void;
  onRequestSupplier: () => void;
}

export function SupplierDirectoryBrowser({
  open,
  onOpenChange,
  onSelectSupplier,
  onRequestSupplier,
}: SupplierDirectoryBrowserProps) {
  const { profile } = useProfile();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [tradeFilter, setTradeFilter] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase
      .from("supplier_directory")
      .select("*")
      .eq("status", "active")
      .order("supplier_name")
      .then(({ data }) => {
        setSuppliers((data as unknown as Supplier[]) || []);
        setLoading(false);
      });
  }, [open]);

  const allTrades = [...new Set(suppliers.flatMap((s) => s.trade_types))].sort();

  const filtered = suppliers.filter((s) => {
    if (search && !s.supplier_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (tradeFilter && !s.trade_types.includes(tradeFilter)) return false;
    return true;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Browse Suppliers</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search suppliers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
        </div>

        {allTrades.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            <Badge
              variant={tradeFilter === null ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => setTradeFilter(null)}
            >
              All
            </Badge>
            {allTrades.map((t) => (
              <Badge
                key={t}
                variant={tradeFilter === t ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() => setTradeFilter(tradeFilter === t ? null : t)}
              >
                {t}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
          {loading ? (
            <p className="text-center text-muted-foreground py-8 text-sm">Loading suppliers...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">No suppliers found</p>
          ) : (
            filtered.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-accent/30 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Globe className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{s.supplier_name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {s.domain && (
                        <span className="text-xs text-muted-foreground truncate">{s.domain}</span>
                      )}
                      {s.trade_types.map((t) => (
                        <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-1.5 flex-shrink-0">
                  {s.is_scrapeable && s.product_count > 0 ? (
                    <Button
                      size="sm"
                      variant="default"
                      className="h-7 text-xs"
                      onClick={() => onSelectSupplier(s, "catalog")}
                    >
                      <BookOpen className="h-3 w-3 mr-1" />
                      Browse
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => onSelectSupplier(s, "csv")}
                      >
                        <Upload className="h-3 w-3 mr-1" />
                        CSV
                      </Button>
                      {s.domain && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => onSelectSupplier(s, "ai_extract")}
                        >
                          <Sparkles className="h-3 w-3 mr-1" />
                          AI Import
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-2 border-t">
          <Button
            variant="ghost"
            className="w-full sm:w-auto text-sm"
            onClick={() => {
              onOpenChange(false);
              onRequestSupplier();
            }}
          >
            Can't find your supplier? Request it →
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
