import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, RotateCcw } from "lucide-react";
import { 
  useCreateTemplate, 
  useUpdateTemplate, 
  Template, 
  TemplateUnit,
  TRADE_CATEGORIES, 
  TEMPLATE_UNITS,
  UNIT_LABELS,
  getTradeCategoryLabel,
  TradeCategory 
} from "@/hooks/useTemplates";

interface TemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: Template | null;
}

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  unit: TemplateUnit;
  is_material: boolean;
  item_type: "labor" | "material";
  sort_order: number;
  catalog_item_id: string | null;
  cost_price: number;
  sell_price: number;
  margin_percent: number;
  line_group: string;
}

const LINE_GROUPS = ["Materials", "Labour", "Other"] as const;
const DISPLAY_MODES = [
  { value: "detailed", label: "Detailed (Full Itemized)" },
  { value: "grouped", label: "Grouped (Subtotals)" },
  { value: "summary", label: "Summary (Lump Sum)" },
  { value: "items_only", label: "Items Only (No Prices)" },
] as const;

export function TemplateFormDialog({ open, onOpenChange, template }: TemplateFormDialogProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<TradeCategory>("general");
  const [description, setDescription] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [labourRateDefault, setLabourRateDefault] = useState(45);
  const [estimatedDuration, setEstimatedDuration] = useState(1);
  const [displayMode, setDisplayMode] = useState("detailed");
  const [items, setItems] = useState<LineItem[]>([]);

  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const isEditing = !!template;
  const isSystemTemplate = template?.is_system_template || false;

  useEffect(() => {
    if (template) {
      setName(template.name);
      setCategory(template.category);
      setDescription(template.description || "");
      setIsFavorite(template.is_favorite);
      setLabourRateDefault(template.labour_rate_default || 45);
      setEstimatedDuration(template.estimated_duration || 1);
      setDisplayMode((template as any).default_display_mode || "detailed");
      setItems(
        template.items?.map((item) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          unit: (item.unit as TemplateUnit) || "each",
          is_material: item.is_material || false,
          item_type: item.item_type as "labor" | "material",
          sort_order: item.sort_order,
          catalog_item_id: item.catalog_item_id || null,
          cost_price: item.cost_price || 0,
          sell_price: item.sell_price || item.unit_price || 0,
          margin_percent: item.margin_percent || 0,
          line_group: item.line_group || "Other",
        })) || []
      );
    } else {
      resetForm();
    }
  }, [template, open]);

  const resetForm = () => {
    setName("");
    setCategory("general");
    setDescription("");
    setIsFavorite(false);
    setLabourRateDefault(45);
    setEstimatedDuration(1);
    setDisplayMode("detailed");
    setItems([]);
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        id: crypto.randomUUID(),
        description: "",
        quantity: 1,
        unit_price: 0,
        unit: "each",
        is_material: false,
        item_type: "labor",
        sort_order: items.length,
        catalog_item_id: null,
        cost_price: 0,
        sell_price: 0,
        margin_percent: 0,
        line_group: "Other",
      },
    ]);
  };

  const updateItem = (id: string, updates: Partial<LineItem>) => {
    setItems(items.map((item) => {
      if (item.id !== id) return item;
      const updated = { ...item, ...updates };
      if (updates.item_type !== undefined) {
        updated.is_material = updates.item_type === "material";
        updated.line_group = updates.item_type === "material" ? "Materials" : "Labour";
      }
      if (updates.is_material !== undefined) {
        updated.item_type = updates.is_material ? "material" : "labor";
      }
      if (updates.cost_price !== undefined || updates.sell_price !== undefined) {
        const sell = updated.sell_price || 0;
        const cost = updated.cost_price || 0;
        updated.margin_percent = sell > 0 ? Math.round(((sell - cost) / sell) * 100) : 0;
        updated.unit_price = sell;
      }
      return updated;
    }));
  };

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const templateData = {
      name,
      category,
      description: description || undefined,
      is_favorite: isFavorite,
      labour_rate_default: labourRateDefault,
      estimated_duration: estimatedDuration,
      default_display_mode: displayMode,
      items: items.map((item, index) => ({
        description: item.description,
        quantity: item.quantity,
        unit_price: item.sell_price || item.unit_price,
        unit: item.unit,
        is_material: item.is_material,
        item_type: item.item_type,
        sort_order: index,
        catalog_item_id: item.catalog_item_id,
        cost_price: item.cost_price,
        sell_price: item.sell_price || item.unit_price,
        margin_percent: item.margin_percent,
        line_group: item.line_group,
      })),
    };

    if (isEditing) {
      await updateTemplate.mutateAsync({ id: template.id, ...templateData });
    } else {
      await createTemplate.mutateAsync(templateData);
    }

    onOpenChange(false);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.quantity * (item.sell_price || item.unit_price), 0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{isEditing ? "Edit Template" : "Create Template"}</DialogTitle>
            {isSystemTemplate && (
              <Badge variant="secondary" className="text-xs">System Template</Badge>
            )}
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Template metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Consumer Unit Upgrade"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Trade Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as TradeCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRADE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {getTradeCategoryLabel(cat)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of when to use this template..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="labourRate">Labour Rate (€/hr)</Label>
              <Input
                id="labourRate"
                type="number"
                min="0"
                step="0.01"
                value={labourRateDefault}
                onChange={(e) => setLabourRateDefault(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Est. Duration (hrs)</Label>
              <Input
                id="duration"
                type="number"
                min="0"
                step="0.5"
                value={estimatedDuration}
                onChange={(e) => setEstimatedDuration(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayMode">Output Mode</Label>
              <Select value={displayMode} onValueChange={setDisplayMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DISPLAY_MODES.map((mode) => (
                    <SelectItem key={mode.value} value={mode.value}>
                      {mode.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end pb-2">
              <div className="flex items-center gap-3">
                <Switch checked={isFavorite} onCheckedChange={setIsFavorite} id="favorite" />
                <Label htmlFor="favorite" className="cursor-pointer text-sm">Favorite</Label>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Line Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed rounded-xl">
                <p className="text-muted-foreground">No items yet. Add your first line item.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Desktop header - hidden on mobile */}
                <div className="hidden md:grid md:grid-cols-12 gap-2 px-3 text-xs font-medium text-muted-foreground">
                  <div className="col-span-4">Description</div>
                  <div className="col-span-1">Type</div>
                  <div className="col-span-1">Group</div>
                  <div className="col-span-1">Unit</div>
                  <div className="col-span-1">Qty</div>
                  <div className="col-span-1">Cost (€)</div>
                  <div className="col-span-1">Sell (€)</div>
                  <div className="col-span-1">Margin</div>
                  <div className="col-span-1">Total</div>
                </div>

                {items.map((item) => (
                  <div key={item.id} className="bg-muted/50 rounded-lg p-3 space-y-2">
                    {/* Desktop: single row */}
                    <div className="hidden md:grid md:grid-cols-12 gap-2 items-center">
                      <div className="col-span-4">
                        <Input
                          placeholder="Description"
                          value={item.description}
                          onChange={(e) => updateItem(item.id, { description: e.target.value })}
                          className="text-sm h-9"
                        />
                      </div>
                      <div className="col-span-1">
                        <Select value={item.item_type} onValueChange={(v) => updateItem(item.id, { item_type: v as "labor" | "material" })}>
                          <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="labor">Labour</SelectItem>
                            <SelectItem value="material">Material</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-1">
                        <Select value={item.line_group} onValueChange={(v) => updateItem(item.id, { line_group: v })}>
                          <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {LINE_GROUPS.map((g) => (
                              <SelectItem key={g} value={g}>{g}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-1">
                        <Select value={item.unit} onValueChange={(v) => updateItem(item.id, { unit: v as TemplateUnit })}>
                          <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {TEMPLATE_UNITS.map((u) => (
                              <SelectItem key={u} value={u}>{UNIT_LABELS[u]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-1">
                        <Input type="number" min="0" step="0.01" value={item.quantity}
                          onChange={(e) => updateItem(item.id, { quantity: parseFloat(e.target.value) || 0 })}
                          className="text-xs h-9" />
                      </div>
                      <div className="col-span-1">
                        <Input type="number" min="0" step="0.01" value={item.cost_price}
                          onChange={(e) => updateItem(item.id, { cost_price: parseFloat(e.target.value) || 0 })}
                          className="text-xs h-9" placeholder="0.00" />
                      </div>
                      <div className="col-span-1">
                        <Input type="number" min="0" step="0.01" value={item.sell_price || item.unit_price}
                          onChange={(e) => updateItem(item.id, { sell_price: parseFloat(e.target.value) || 0 })}
                          className="text-xs h-9" placeholder="0.00" />
                      </div>
                      <div className="col-span-1 flex items-center justify-between">
                        <span className={`text-xs font-medium ${item.margin_percent > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                          {item.margin_percent > 0 ? `${item.margin_percent}%` : '—'}
                        </span>
                      </div>
                      <div className="col-span-1 flex items-center justify-between">
                        <span className="text-xs font-semibold">
                          €{((item.sell_price || item.unit_price) * item.quantity).toFixed(2)}
                        </span>
                        <Button type="button" variant="ghost" size="icon"
                          onClick={() => removeItem(item.id)}
                          className="text-destructive hover:text-destructive h-7 w-7 shrink-0">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Mobile: card layout */}
                    <div className="md:hidden space-y-2">
                      <div className="flex items-start gap-2">
                        <Input
                          placeholder="Description"
                          value={item.description}
                          onChange={(e) => updateItem(item.id, { description: e.target.value })}
                          className="text-sm h-9 flex-1"
                        />
                        <Button type="button" variant="ghost" size="icon"
                          onClick={() => removeItem(item.id)}
                          className="text-destructive hover:text-destructive h-9 w-9 shrink-0">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Type</Label>
                          <Select value={item.item_type} onValueChange={(v) => updateItem(item.id, { item_type: v as "labor" | "material" })}>
                            <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="labor">Labour</SelectItem>
                              <SelectItem value="material">Material</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Group</Label>
                          <Select value={item.line_group} onValueChange={(v) => updateItem(item.id, { line_group: v })}>
                            <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {LINE_GROUPS.map((g) => (
                                <SelectItem key={g} value={g}>{g}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Unit</Label>
                          <Select value={item.unit} onValueChange={(v) => updateItem(item.id, { unit: v as TemplateUnit })}>
                            <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {TEMPLATE_UNITS.map((u) => (
                                <SelectItem key={u} value={u}>{UNIT_LABELS[u]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Qty</Label>
                          <Input type="number" min="0" step="0.01" value={item.quantity}
                            onChange={(e) => updateItem(item.id, { quantity: parseFloat(e.target.value) || 0 })}
                            className="text-xs h-8" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Cost (€)</Label>
                          <Input type="number" min="0" step="0.01" value={item.cost_price}
                            onChange={(e) => updateItem(item.id, { cost_price: parseFloat(e.target.value) || 0 })}
                            className="text-xs h-8" placeholder="0.00" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Sell (€)</Label>
                          <Input type="number" min="0" step="0.01" value={item.sell_price || item.unit_price}
                            onChange={(e) => updateItem(item.id, { sell_price: parseFloat(e.target.value) || 0 })}
                            className="text-xs h-8" placeholder="0.00" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-border/50">
                        <span className={`text-xs ${item.margin_percent > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                          Margin: {item.margin_percent > 0 ? `${item.margin_percent}%` : '—'}
                        </span>
                        <span className="text-sm font-semibold">
                          €{((item.sell_price || item.unit_price) * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Totals */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end pt-2 px-3 gap-2">
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p>Total Cost: €{items.reduce((sum, i) => sum + (i.cost_price || 0) * i.quantity, 0).toFixed(2)}</p>
                    <p>Overall Margin: {(() => {
                      const totalSell = items.reduce((sum, i) => sum + (i.sell_price || i.unit_price) * i.quantity, 0);
                      const totalCost = items.reduce((sum, i) => sum + (i.cost_price || 0) * i.quantity, 0);
                      return totalSell > 0 ? `${Math.round(((totalSell - totalCost) / totalSell) * 100)}%` : '—';
                    })()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Sell Total</p>
                    <p className="text-xl font-bold">€{calculateTotal().toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between gap-3 pt-4 border-t">
            {isSystemTemplate && (
              <Button type="button" variant="outline" size="sm" disabled>
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset to Default
              </Button>
            )}
            <div className="flex-1" />
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createTemplate.isPending || updateTemplate.isPending}>
              {isEditing ? "Save Changes" : "Create Template"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
