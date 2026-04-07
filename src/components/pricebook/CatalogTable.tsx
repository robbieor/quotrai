import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Star, Pencil, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Check, X } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";
import type { CatalogItem } from "@/hooks/useTeamCatalog";

type SortKey = "item_name" | "supplier_name" | "cost_price" | "sell_price" | "margin" | "category" | "last_used_at";
type SortDir = "asc" | "desc";

interface CatalogTableProps {
  items: CatalogItem[];
  selectedIds: Set<string>;
  onSelectToggle: (id: string) => void;
  onSelectAll: () => void;
  onEdit: (item: CatalogItem) => void;
  onDelete: (id: string) => void;
  onToggleFav: (id: string, fav: boolean) => void;
  onInlineUpdate: (id: string, updates: Partial<CatalogItem>) => void;
  marginThreshold?: number;
}

function getMargin(item: CatalogItem): number {
  if (item.sell_price <= 0) return 0;
  return ((item.sell_price - item.cost_price) / item.sell_price) * 100;
}

export function CatalogTable({
  items,
  selectedIds,
  onSelectToggle,
  onSelectAll,
  onEdit,
  onDelete,
  onToggleFav,
  onInlineUpdate,
  marginThreshold = 15,
}: CatalogTableProps) {
  const { formatCurrency } = useCurrency();
  const [sortKey, setSortKey] = useState<SortKey>("item_name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [editingCell, setEditingCell] = useState<{ id: string; field: "cost_price" | "sell_price" } | null>(null);
  const [editValue, setEditValue] = useState("");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "item_name": cmp = (a.item_name || "").localeCompare(b.item_name || ""); break;
        case "supplier_name": cmp = (a.supplier_name || "").localeCompare(b.supplier_name || ""); break;
        case "cost_price": cmp = a.cost_price - b.cost_price; break;
        case "sell_price": cmp = a.sell_price - b.sell_price; break;
        case "margin": cmp = getMargin(a) - getMargin(b); break;
        case "category": cmp = (a.category || "").localeCompare(b.category || ""); break;
        case "last_used_at": cmp = (a.last_used_at || "").localeCompare(b.last_used_at || ""); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [items, sortKey, sortDir]);

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  const startEdit = (id: string, field: "cost_price" | "sell_price", value: number) => {
    setEditingCell({ id, field });
    setEditValue(value.toFixed(2));
  };

  const commitEdit = () => {
    if (!editingCell) return;
    const num = parseFloat(editValue);
    if (!isNaN(num) && num >= 0) {
      onInlineUpdate(editingCell.id, { [editingCell.field]: num });
    }
    setEditingCell(null);
  };

  const cancelEdit = () => setEditingCell(null);

  const allSelected = items.length > 0 && selectedIds.size === items.length;

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="w-10 h-8 px-2">
              <Checkbox checked={allSelected} onCheckedChange={onSelectAll} />
            </TableHead>
            <TableHead className="h-8 px-2 w-8" />
            <TableHead className="h-8 px-2">
              <button onClick={() => toggleSort("item_name")} className="flex items-center gap-1 text-xs font-medium">
                Product <SortIcon col="item_name" />
              </button>
            </TableHead>
            <TableHead className="h-8 px-2 hidden lg:table-cell">
              <button onClick={() => toggleSort("supplier_name")} className="flex items-center gap-1 text-xs font-medium">
                Supplier <SortIcon col="supplier_name" />
              </button>
            </TableHead>
            <TableHead className="h-8 px-2 hidden md:table-cell">SKU</TableHead>
            <TableHead className="h-8 px-2">
              <button onClick={() => toggleSort("cost_price")} className="flex items-center gap-1 text-xs font-medium">
                Cost <SortIcon col="cost_price" />
              </button>
            </TableHead>
            <TableHead className="h-8 px-2">
              <button onClick={() => toggleSort("sell_price")} className="flex items-center gap-1 text-xs font-medium">
                Sell <SortIcon col="sell_price" />
              </button>
            </TableHead>
            <TableHead className="h-8 px-2 w-16">
              <button onClick={() => toggleSort("margin")} className="flex items-center gap-1 text-xs font-medium">
                Margin <SortIcon col="margin" />
              </button>
            </TableHead>
            <TableHead className="h-8 px-2 hidden xl:table-cell">
              <button onClick={() => toggleSort("category")} className="flex items-center gap-1 text-xs font-medium">
                Category <SortIcon col="category" />
              </button>
            </TableHead>
            <TableHead className="h-8 px-2 w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((item) => {
            const margin = getMargin(item);
            const isLowMargin = margin > 0 && margin < marginThreshold;
            const isEditing = (field: string) => editingCell?.id === item.id && editingCell?.field === field;

            return (
              <TableRow
                key={item.id}
                className={`group ${isLowMargin ? "bg-destructive/5" : ""}`}
                data-state={selectedIds.has(item.id) ? "selected" : undefined}
              >
                <TableCell className="py-1.5 px-2">
                  <Checkbox
                    checked={selectedIds.has(item.id)}
                    onCheckedChange={() => onSelectToggle(item.id)}
                  />
                </TableCell>
                <TableCell className="py-1.5 px-2">
                  <button onClick={() => onToggleFav(item.id, !item.is_favourite)} className="hover:scale-110 transition-transform">
                    <Star className={`h-3.5 w-3.5 ${item.is_favourite ? "fill-amber-500 text-amber-500" : "text-muted-foreground/40"}`} />
                  </button>
                </TableCell>
                <TableCell className="py-1.5 px-2 max-w-[200px]">
                  <p className="text-sm font-medium truncate">{item.item_name}</p>
                  {item.manufacturer && (
                    <p className="text-[10px] text-muted-foreground truncate">{item.manufacturer}</p>
                  )}
                </TableCell>
                <TableCell className="py-1.5 px-2 hidden lg:table-cell">
                  <span className="text-xs text-muted-foreground">{item.supplier_name || "—"}</span>
                </TableCell>
                <TableCell className="py-1.5 px-2 hidden md:table-cell">
                  <span className="text-xs text-muted-foreground font-mono">{item.supplier_sku || "—"}</span>
                </TableCell>
                <TableCell className="py-1.5 px-2">
                  {isEditing("cost_price") ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") cancelEdit(); }}
                        className="h-6 w-20 text-xs px-1.5"
                        autoFocus
                      />
                      <button onClick={commitEdit}><Check className="h-3 w-3 text-primary" /></button>
                      <button onClick={cancelEdit}><X className="h-3 w-3 text-muted-foreground" /></button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEdit(item.id, "cost_price", item.cost_price)}
                      className="text-xs font-medium hover:text-primary transition-colors cursor-text"
                    >
                      {formatCurrency(item.cost_price)}
                    </button>
                  )}
                </TableCell>
                <TableCell className="py-1.5 px-2">
                  {isEditing("sell_price") ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") cancelEdit(); }}
                        className="h-6 w-20 text-xs px-1.5"
                        autoFocus
                      />
                      <button onClick={commitEdit}><Check className="h-3 w-3 text-primary" /></button>
                      <button onClick={cancelEdit}><X className="h-3 w-3 text-muted-foreground" /></button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEdit(item.id, "sell_price", item.sell_price)}
                      className="text-xs font-semibold hover:text-primary transition-colors cursor-text"
                    >
                      {formatCurrency(item.sell_price)}
                    </button>
                  )}
                </TableCell>
                <TableCell className="py-1.5 px-2">
                  {margin > 0 ? (
                    <Badge
                      variant={isLowMargin ? "destructive" : "default"}
                      className="text-[10px] px-1.5 py-0"
                    >
                      {margin.toFixed(1)}%
                    </Badge>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="py-1.5 px-2 hidden xl:table-cell">
                  {item.category && (
                    <Badge variant="secondary" className="text-[10px]">{item.category}</Badge>
                  )}
                </TableCell>
                <TableCell className="py-1.5 px-2">
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEdit(item)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => onDelete(item.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={10} className="text-center py-8 text-muted-foreground text-sm">
                No items found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
