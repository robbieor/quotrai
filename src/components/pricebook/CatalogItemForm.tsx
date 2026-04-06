import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { CatalogItem } from "@/hooks/useTeamCatalog";

const CATEGORIES = ["Lighting", "Cable", "Switches", "Sockets", "Distribution", "Trunking", "Fire Safety", "Labour", "Materials", "Plumbing", "Carpentry", "Painting", "Roofing", "General", "Other"];
const UNITS = ["each", "metre", "sqm", "hour", "day", "box", "roll", "litre", "kg", "set"];
const TRADE_TYPES = ["Electrical", "Plumbing", "Carpentry", "Painting", "Roofing", "General"];

interface CatalogItemFormProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  item?: CatalogItem | null;
  onSubmit: (vals: any) => void;
}

export function CatalogItemForm({ open, onOpenChange, item, onSubmit }: CatalogItemFormProps) {
  const [form, setForm] = useState({
    item_name: item?.item_name || "",
    supplier_name: item?.supplier_name || "",
    supplier_sku: item?.supplier_sku || "",
    manufacturer: item?.manufacturer || "",
    category: item?.category || "",
    subcategory: item?.subcategory || "",
    trade_type: item?.trade_type || "Electrical",
    unit: item?.unit || "each",
    website_price: item?.website_price?.toString() || "",
    discount_percent: item?.discount_percent?.toString() || "0",
    cost_price: item?.cost_price?.toString() || "0",
    markup_percent: item?.markup_percent?.toString() || "30",
    sell_price: item?.sell_price?.toString() || "0",
  });

  const margin = parseFloat(form.sell_price) > 0 && parseFloat(form.cost_price) > 0
    ? (((parseFloat(form.sell_price) - parseFloat(form.cost_price)) / parseFloat(form.sell_price)) * 100).toFixed(1)
    : null;

  // Auto-calc cost from web price + discount
  const recalcCost = (webPrice: string, discount: string) => {
    const wp = parseFloat(webPrice) || 0;
    const d = parseFloat(discount) || 0;
    return wp > 0 ? (wp * (1 - d / 100)).toFixed(2) : form.cost_price;
  };

  const recalcSell = (cost: string, markup: string) => {
    const c = parseFloat(cost) || 0;
    const m = parseFloat(markup) || 0;
    return c > 0 ? (c * (1 + m / 100)).toFixed(2) : form.sell_price;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{item ? "Edit Catalog Item" : "Add Catalog Item"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1 max-h-[60vh] overflow-y-auto">
          <div>
            <Label>Item Name *</Label>
            <Input value={form.item_name} onChange={(e) => setForm({ ...form, item_name: e.target.value })} placeholder="10W LED Floodlight" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Supplier</Label>
              <Input value={form.supplier_name} onChange={(e) => setForm({ ...form, supplier_name: e.target.value })} placeholder="Wesco" />
            </div>
            <div>
              <Label>SKU</Label>
              <Input value={form.supplier_sku} onChange={(e) => setForm({ ...form, supplier_sku: e.target.value })} placeholder="PH12345" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Manufacturer</Label>
              <Input value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} placeholder="Philips" />
            </div>
            <div>
              <Label>Trade Type</Label>
              <Select value={form.trade_type} onValueChange={(v) => setForm({ ...form, trade_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRADE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Subcategory</Label>
              <Input value={form.subcategory} onChange={(e) => setForm({ ...form, subcategory: e.target.value })} placeholder="Optional" />
            </div>
            <div>
              <Label>Unit</Label>
              <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t border-border pt-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">PRICING</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Website/List Price</Label>
                <Input
                  type="number" step="0.01"
                  value={form.website_price}
                  onChange={(e) => {
                    const newCost = recalcCost(e.target.value, form.discount_percent);
                    const newSell = recalcSell(newCost, form.markup_percent);
                    setForm({ ...form, website_price: e.target.value, cost_price: newCost, sell_price: newSell });
                  }}
                />
              </div>
              <div>
                <Label>Discount %</Label>
                <Input
                  type="number" step="0.1"
                  value={form.discount_percent}
                  onChange={(e) => {
                    const newCost = recalcCost(form.website_price, e.target.value);
                    const newSell = recalcSell(newCost, form.markup_percent);
                    setForm({ ...form, discount_percent: e.target.value, cost_price: newCost, sell_price: newSell });
                  }}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div>
                <Label>Cost Price</Label>
                <Input
                  type="number" step="0.01"
                  value={form.cost_price}
                  onChange={(e) => {
                    const newSell = recalcSell(e.target.value, form.markup_percent);
                    setForm({ ...form, cost_price: e.target.value, sell_price: newSell });
                  }}
                />
              </div>
              <div>
                <Label>Markup %</Label>
                <Input
                  type="number" step="0.1"
                  value={form.markup_percent}
                  onChange={(e) => {
                    const newSell = recalcSell(form.cost_price, e.target.value);
                    setForm({ ...form, markup_percent: e.target.value, sell_price: newSell });
                  }}
                />
              </div>
              <div>
                <Label>Sell Price</Label>
                <Input type="number" step="0.01" value={form.sell_price} onChange={(e) => setForm({ ...form, sell_price: e.target.value })} />
              </div>
            </div>
            {margin && (
              <div className="flex items-center gap-2 text-sm mt-2">
                <span className="text-muted-foreground">Margin:</span>
                <Badge variant={parseFloat(margin) >= 20 ? "default" : "destructive"} className="text-xs">{margin}%</Badge>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={!form.item_name}
            onClick={() => {
              onSubmit({
                item_name: form.item_name,
                supplier_name: form.supplier_name || null,
                supplier_sku: form.supplier_sku || null,
                manufacturer: form.manufacturer || null,
                category: form.category || null,
                subcategory: form.subcategory || null,
                trade_type: form.trade_type || "Electrical",
                unit: form.unit,
                website_price: parseFloat(form.website_price) || null,
                discount_percent: parseFloat(form.discount_percent) || 0,
                cost_price: parseFloat(form.cost_price) || 0,
                markup_percent: parseFloat(form.markup_percent) || 30,
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
