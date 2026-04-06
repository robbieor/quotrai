import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Search, Plus, Globe, Settings2, Filter } from "lucide-react";
import { useTeamCatalog, type CatalogItem, type CatalogFilters } from "@/hooks/useTeamCatalog";
import { usePricebooks } from "@/hooks/usePricebooks";
import { CatalogSidebar } from "@/components/pricebook/CatalogSidebar";
import { CatalogProductCard } from "@/components/pricebook/CatalogProductCard";
import { CatalogItemForm } from "@/components/pricebook/CatalogItemForm";
import { ImportFromUrlDialog } from "@/components/pricebook/ImportFromUrlDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

export default function PricebookDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { pricebooks } = usePricebooks();
  const pricebook = pricebooks.find((pb) => pb.id === id);

  const [filters, setFilters] = useState<CatalogFilters>({ pricebook_id: id });
  const { items, isLoading, filterOptions, addItem, updateItem, deleteItem, toggleFavourite } = useTeamCatalog(filters);

  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<CatalogItem | null>(null);
  const [showUrlImport, setShowUrlImport] = useState(false);

  const handleSearch = (q: string) => setFilters({ ...filters, search: q });

  const sidebar = (
    <CatalogSidebar filters={filters} onFiltersChange={setFilters} options={filterOptions} />
  );

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/price-book")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">{pricebook?.name || "Pricebook"}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                {pricebook?.supplier_name && (
                  <span className="text-xs text-muted-foreground">{pricebook.supplier_name}</span>
                )}
                {pricebook?.trade_type && (
                  <Badge variant="outline" className="text-[10px]">{pricebook.trade_type}</Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {pricebook?.source_type === "website" && (
              <Button size="sm" variant="outline" onClick={() => setShowUrlImport(true)}>
                <Globe className="h-4 w-4 mr-1.5" /> Import Product
              </Button>
            )}
            <Button size="sm" onClick={() => { setEditItem(null); setShowForm(true); }}>
              <Plus className="h-4 w-4 mr-1.5" /> Add Item
            </Button>
          </div>
        </div>

        {/* Search */}
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
            <SheetContent side="left" className="w-64 p-4 pt-8">{sidebar}</SheetContent>
          </Sheet>
        </div>

        {/* Content */}
        <div className="flex gap-6">
          <div className="hidden sm:block w-48 flex-shrink-0">
            <Card><CardContent className="p-4">{sidebar}</CardContent></Card>
          </div>

          <div className="flex-1 min-w-0">
            {isLoading ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">Loading...</CardContent></Card>
            ) : items.length === 0 ? (
              <EmptyState
                icon={Search}
                title="No items in this catalog"
                description={pricebook?.source_type === "website"
                  ? "Import products from the supplier URL or add items manually."
                  : "Add items manually or import a CSV."}
                actionLabel={pricebook?.source_type === "website" ? "Import Product" : "Add Item"}
                onAction={() => pricebook?.source_type === "website" ? setShowUrlImport(true) : setShowForm(true)}
              />
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">{items.length} item{items.length !== 1 ? "s" : ""}</p>
                {items.map((item) => (
                  <CatalogProductCard
                    key={item.id}
                    item={item}
                    onEdit={(i) => { setEditItem(i); setShowForm(true); }}
                    onDelete={(delId) => deleteItem.mutate(delId)}
                    onToggleFav={(favId, fav) => toggleFavourite.mutate({ id: favId, is_favourite: fav })}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="pb-24" />
      </div>

      {showForm && (
        <CatalogItemForm
          open={showForm}
          onOpenChange={setShowForm}
          item={editItem}
          onSubmit={(vals) => {
            const payload = { ...vals, pricebook_id: id } as any;
            if (editItem) {
              updateItem.mutate({ id: editItem.id, ...payload });
            } else {
              addItem.mutate(payload);
            }
          }}
        />
      )}

      <ImportFromUrlDialog
        open={showUrlImport}
        onOpenChange={setShowUrlImport}
        onImport={(product) => addItem.mutate({ ...product, pricebook_id: id } as any)}
      />
    </DashboardLayout>
  );
}
