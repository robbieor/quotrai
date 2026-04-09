import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Settings2, BookOpen, Search } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePricebooks } from "@/hooks/usePricebooks";
import { useTeamCatalog, type CatalogItem } from "@/hooks/useTeamCatalog";
import { EmptyState } from "@/components/shared/EmptyState";
import { PricebookCard } from "@/components/pricebook/PricebookCard";
import { PricebookStats } from "@/components/pricebook/PricebookStats";
import { RecentItems } from "@/components/pricebook/RecentItems";
import { AddPriceSourceDialog } from "@/components/pricebook/AddPriceSourceDialog";
import { ManualCatalogDialog } from "@/components/pricebook/ManualCatalogDialog";
import { CsvImportDialog } from "@/components/pricebook/CsvImportDialog";
import { SupplierSettingsDialog } from "@/components/pricebook/SupplierSettingsDialog";
import { useQueryClient } from "@tanstack/react-query";

export default function PriceBook() {
  const { pricebooks, isLoading } = usePricebooks();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const { items: allItems } = useTeamCatalog({});

  const [showAddSource, setShowAddSource] = useState(false);
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [showSupplierSettings, setShowSupplierSettings] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");

  const stats = useMemo(() => {
    const totalItems = allItems.length;
    const suppliers = new Set(allItems.map((i) => i.supplier_name).filter(Boolean));
    const margins = allItems.filter((i) => i.sell_price > 0).map((i) => ((i.sell_price - i.cost_price) / i.sell_price) * 100);
    const avgMargin = margins.length > 0 ? margins.reduce((a, b) => a + b, 0) / margins.length : 0;
    const lowMarginCount = margins.filter((m) => m > 0 && m < 15).length;
    return { totalItems, totalSuppliers: suppliers.size, avgMargin, lowMarginCount };
  }, [allItems]);

  const recentItems = useMemo(() => {
    return [...allItems]
      .filter((i) => i.last_used_at)
      .sort((a, b) => (b.last_used_at || "").localeCompare(a.last_used_at || ""))
      .slice(0, 10);
  }, [allItems]);

  const searchResults = useMemo(() => {
    if (!globalSearch || globalSearch.length < 2) return [];
    const q = globalSearch.toLowerCase();
    return allItems.filter(
      (i) =>
        i.item_name?.toLowerCase().includes(q) ||
        i.supplier_sku?.toLowerCase().includes(q) ||
        i.manufacturer?.toLowerCase().includes(q) ||
        i.supplier_name?.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [allItems, globalSearch]);

  const handleSourceSelect = (type: "supplier_directory" | "csv" | "manual" | "ai_extract") => {
    if (type === "csv") setShowCsvImport(true);
    else setShowManualDialog(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-[28px] font-bold tracking-[-0.02em]">Price Book</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Your supplier catalogs and pricing libraries
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowSupplierSettings(true)}>
              <Settings2 className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Supplier Settings</span>
            </Button>
            <Button size="sm" onClick={() => setShowAddSource(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add Price Source
            </Button>
          </div>
        </div>

        {stats.totalItems > 0 && !isMobile && (
          <PricebookStats
            totalItems={stats.totalItems}
            totalSuppliers={stats.totalSuppliers}
            avgMargin={stats.avgMargin}
            lowMarginCount={stats.lowMarginCount}
          />
        )}

        {allItems.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search across all pricebooks..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="pl-9"
            />
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-64 overflow-auto">
                {searchResults.map((item) => (
                  <button
                    key={item.id}
                    className="w-full text-left px-3 py-2 hover:bg-accent/50 transition-colors border-b border-border last:border-0"
                    onClick={() => {
                      setGlobalSearch("");
                      const pb = pricebooks.find((p) => allItems.some((i) => i.id === item.id && (i as any).pricebook_id === p.id));
                      if (pb) navigate(`/price-book/${pb.id}`);
                    }}
                  >
                    <p className="text-sm font-medium truncate">{item.item_name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {[item.supplier_name, item.supplier_sku, item.category].filter(Boolean).join(" · ")}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {!isMobile && <RecentItems items={recentItems} />}

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading catalogs...</div>
        ) : pricebooks.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No price sources yet"
            description="Upload a supplier CSV price list or create a manual catalog to get started."
            actionLabel="Add Price Source"
            onAction={() => setShowAddSource(true)}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pricebooks.map((pb) => (
              <PricebookCard
                key={pb.id}
                pricebook={pb}
                onClick={() => navigate(`/price-book/${pb.id}`)}
                onDelete={() => queryClient.invalidateQueries({ queryKey: ["pricebooks"] })}
              />
            ))}
          </div>
        )}

        <div className="pb-24" />
      </div>

      <AddPriceSourceDialog
        open={showAddSource}
        onOpenChange={setShowAddSource}
        onSelect={handleSourceSelect}
      />

      <ManualCatalogDialog
        open={showManualDialog}
        onOpenChange={setShowManualDialog}
        onComplete={() => queryClient.invalidateQueries({ queryKey: ["pricebooks"] })}
      />

      <CsvImportDialog
        open={showCsvImport}
        onOpenChange={setShowCsvImport}
        onComplete={() => queryClient.invalidateQueries({ queryKey: ["pricebooks"] })}
      />

      <SupplierSettingsDialog
        open={showSupplierSettings}
        onOpenChange={setShowSupplierSettings}
      />
    </DashboardLayout>
  );
}
