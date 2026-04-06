import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Search, Upload, Globe, Settings2, ChevronDown, Package, Filter } from "lucide-react";
import { useTeamCatalog, type CatalogItem, type CatalogFilters } from "@/hooks/useTeamCatalog";
import { EmptyState } from "@/components/shared/EmptyState";
import { CatalogSidebar } from "@/components/pricebook/CatalogSidebar";
import { CatalogProductCard } from "@/components/pricebook/CatalogProductCard";
import { CatalogItemForm } from "@/components/pricebook/CatalogItemForm";
import { ImportFromUrlDialog } from "@/components/pricebook/ImportFromUrlDialog";
import { SupplierSettingsDialog } from "@/components/pricebook/SupplierSettingsDialog";
import { CsvImportDialog } from "@/components/pricebook/CsvImportDialog";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useQueryClient } from "@tanstack/react-query";

export default function PriceBook() {
  const [filters, setFilters] = useState<CatalogFilters>({});
  const { items, isLoading, filterOptions, addItem, updateItem, deleteItem, toggleFavourite } = useTeamCatalog(filters);
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<CatalogItem | null>(null);
  const [showUrlImport, setShowUrlImport] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [showSupplierSettings, setShowSupplierSettings] = useState(false);

  const handleSearch = (q: string) => setFilters({ ...filters, search: q });

  const sidebar = (
    <CatalogSidebar
      filters={filters}
      onFiltersChange={setFilters}
      options={filterOptions}
    />
  );

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-[28px] font-bold tracking-[-0.02em]">Price Book</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowSupplierSettings(true)}>
              <Settings2 className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Supplier Settings</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1.5" />Add<ChevronDown className="h-3.5 w-3.5 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { setEditItem(null); setShowForm(true); }}>
                  <Plus className="h-4 w-4 mr-2" />Manual Entry
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowUrlImport(true)}>
                  <Globe className="h-4 w-4 mr-2" />From Supplier URL
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowCsvImport(true)}>
                  <Upload className="h-4 w-4 mr-2" />Import CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Search + Mobile filter */}
        <div className="flex gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products, SKU, manufacturer..."
              value={filters.search || ""}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="sm:hidden h-11 w-11">
                <Filter className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-4 pt-8">
              {sidebar}
            </SheetContent>
          </Sheet>
        </div>

        {/* Content: sidebar + product list */}
        <div className="flex gap-6">
          {/* Desktop sidebar */}
          <div className="hidden sm:block w-48 flex-shrink-0">
            <Card>
              <CardContent className="p-4">
                {sidebar}
              </CardContent>
            </Card>
          </div>

          {/* Product list */}
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">Loading catalog...</CardContent></Card>
            ) : items.length === 0 ? (
              <EmptyState
                icon={Package}
                title="No items in your catalog"
                description="Add materials and labour rates from supplier URLs, CSV imports, or manual entry."
                actionLabel="Add First Item"
                onAction={() => { setEditItem(null); setShowForm(true); }}
              />
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">{items.length} item{items.length !== 1 ? "s" : ""}</p>
                {items.map((item) => (
                  <CatalogProductCard
                    key={item.id}
                    item={item}
                    onEdit={(i) => { setEditItem(i); setShowForm(true); }}
                    onDelete={(id) => deleteItem.mutate(id)}
                    onToggleFav={(id, fav) => toggleFavourite.mutate({ id, is_favourite: fav })}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="pb-24" />
      </div>

      {/* Dialogs */}
      {showForm && (
        <CatalogItemForm
          open={showForm}
          onOpenChange={setShowForm}
          item={editItem}
          onSubmit={(vals) => {
            if (editItem) {
              updateItem.mutate({ id: editItem.id, ...vals });
            } else {
              addItem.mutate(vals);
            }
          }}
        />
      )}

      <ImportFromUrlDialog
        open={showUrlImport}
        onOpenChange={setShowUrlImport}
        onImport={(product) => addItem.mutate(product)}
      />

      <CsvImportDialog
        open={showCsvImport}
        onOpenChange={setShowCsvImport}
        onComplete={() => queryClient.invalidateQueries({ queryKey: ["team-catalog"] })}
      />

      <SupplierSettingsDialog
        open={showSupplierSettings}
        onOpenChange={setShowSupplierSettings}
      />
    </DashboardLayout>
  );
}
