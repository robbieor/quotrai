import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Upload, Trash2, Pencil, Package } from "lucide-react";
import { usePriceBook, type PriceBookItem } from "@/hooks/usePriceBook";
import { useCurrency } from "@/hooks/useCurrency";
import { EmptyState } from "@/components/shared/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useProfile } from "@/hooks/useProfile";

const CATEGORIES = ["Labour", "Materials", "Plumbing", "Electrical", "Carpentry", "Painting", "Roofing", "General", "Other"];
const UNITS = ["each", "metre", "sqm", "hour", "day", "box", "roll", "litre", "kg", "set"];

function PriceBookItemForm({
  open,
  onOpenChange,
  item,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  item?: PriceBookItem | null;
  onSubmit: (vals: any) => void;
}) {
  const [form, setForm] = useState({
    item_name: item?.item_name || "",
    supplier_name: item?.supplier_name || "",
    category: item?.category || "",
    unit: item?.unit || "each",
    cost_price: item?.cost_price?.toString() || "0",
    sell_price: item?.sell_price?.toString() || "0",
  });

  const margin = parseFloat(form.sell_price) > 0 && parseFloat(form.cost_price) > 0
    ? (((parseFloat(form.sell_price) - parseFloat(form.cost_price)) / parseFloat(form.sell_price)) * 100).toFixed(1)
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{item ? "Edit Item" : "Add Price Book Item"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Item Name *</Label>
            <Input value={form.item_name} onChange={(e) => setForm({ ...form, item_name: e.target.value })} placeholder="15mm copper pipe" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Supplier</Label>
              <Input value={form.supplier_name} onChange={(e) => setForm({ ...form, supplier_name: e.target.value })} placeholder="Screwfix" />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Unit</Label>
              <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cost Price</Label>
              <Input type="number" step="0.01" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} />
            </div>
            <div>
              <Label>Sell Price</Label>
              <Input type="number" step="0.01" value={form.sell_price} onChange={(e) => setForm({ ...form, sell_price: e.target.value })} />
            </div>
          </div>
          {margin !== null && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Margin:</span>
              <Badge variant={parseFloat(margin) >= 20 ? "default" : "destructive"} className="text-xs">
                {margin}%
              </Badge>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={!form.item_name}
            onClick={() => {
              onSubmit({
                item_name: form.item_name,
                supplier_name: form.supplier_name || null,
                category: form.category || null,
                unit: form.unit,
                cost_price: parseFloat(form.cost_price) || 0,
                sell_price: parseFloat(form.sell_price) || 0,
              });
              onOpenChange(false);
            }}
          >
            {item ? "Update" : "Add Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PriceBook() {
  const { items, isLoading, addItem, updateItem, deleteItem } = usePriceBook();
  const { formatCurrency } = useCurrency();
  const { profile } = useProfile();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<PriceBookItem | null>(null);
  const [importing, setImporting] = useState(false);

  const filtered = items.filter((i) =>
    i.item_name.toLowerCase().includes(search.toLowerCase()) ||
    (i.supplier_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (i.category || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split("\n").filter(Boolean);
      if (lines.length < 2) throw new Error("CSV must have a header row and at least one data row");

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const required = ["item_name"];
      if (!required.every((r) => headers.includes(r))) {
        throw new Error("CSV must include 'item_name' column. Optional: supplier_name, category, unit, cost_price, sell_price");
      }

      const rows = lines.slice(1).map((line) => {
        const vals = line.split(",").map((v) => v.trim().replace(/^["']|["']$/g, ""));
        const row: any = {};
        headers.forEach((h, i) => { row[h] = vals[i] || ""; });
        return {
          item_name: row.item_name,
          supplier_name: row.supplier_name || null,
          category: row.category || null,
          unit: row.unit || "each",
          cost_price: parseFloat(row.cost_price) || 0,
          sell_price: parseFloat(row.sell_price) || 0,
          team_id: profile?.team_id,
        };
      }).filter((r) => r.item_name && r.team_id);

      if (rows.length === 0) throw new Error("No valid rows found");

      const { error } = await supabase.from("supplier_price_book" as any).insert(rows);
      if (error) throw error;

      toast.success(`Imported ${rows.length} items`);
      // Invalidate
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Import failed");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-[28px] font-bold tracking-[-0.02em]">Price Book</h1>
          <div className="flex gap-2">
            <label className="cursor-pointer">
              <input type="file" accept=".csv" className="hidden" onChange={handleCsvImport} disabled={importing} />
              <Button variant="outline" size="sm" asChild disabled={importing}>
                <span><Upload className="h-4 w-4 mr-1.5" />{importing ? "Importing..." : "Import CSV"}</span>
              </Button>
            </label>
            <Button size="sm" onClick={() => { setEditItem(null); setShowForm(true); }}>
              <Plus className="h-4 w-4 mr-1.5" />Add Item
            </Button>
          </div>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search items..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        {isLoading ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">Loading...</CardContent></Card>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No price book items"
            description="Add materials and labour rates to auto-fill quote line items with accurate pricing."
            actionLabel="Add First Item"
            onAction={() => { setEditItem(null); setShowForm(true); }}
          />
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="hidden sm:table-cell">Supplier</TableHead>
                      <TableHead className="hidden sm:table-cell">Category</TableHead>
                      <TableHead className="text-center">Unit</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="text-right">Sell</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">Margin</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((item) => {
                      const margin = item.sell_price > 0
                        ? (((item.sell_price - item.cost_price) / item.sell_price) * 100).toFixed(1)
                        : "—";
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.item_name}</TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground">{item.supplier_name || "—"}</TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {item.category && <Badge variant="secondary" className="text-xs">{item.category}</Badge>}
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground text-xs">{item.unit}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.cost_price)}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(item.sell_price)}</TableCell>
                          <TableCell className="text-right hidden sm:table-cell">
                            {margin !== "—" && (
                              <Badge variant={parseFloat(margin) >= 20 ? "default" : "destructive"} className="text-xs">
                                {margin}%
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 justify-end">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditItem(item); setShowForm(true); }}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteItem.mutate(item.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
        <div className="pb-24" />
      </div>

      {showForm && (
        <PriceBookItemForm
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
    </DashboardLayout>
  );
}
