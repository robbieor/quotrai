import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus } from "lucide-react";
import { useSupplierSettings } from "@/hooks/useSupplierSettings";

interface SupplierSettingsDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function SupplierSettingsDialog({ open, onOpenChange }: SupplierSettingsDialogProps) {
  const { settings, upsertSetting, deleteSetting } = useSupplierSettings();
  const [newName, setNewName] = useState("");
  const [newDiscount, setNewDiscount] = useState("0");
  const [newMarkup, setNewMarkup] = useState("30");

  const handleAdd = () => {
    if (!newName.trim()) return;
    upsertSetting.mutate({
      supplier_name: newName.trim(),
      discount_percent: parseFloat(newDiscount) || 0,
      default_markup_percent: parseFloat(newMarkup) || 30,
    });
    setNewName("");
    setNewDiscount("0");
    setNewMarkup("30");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Supplier Discount Settings</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Set your negotiated discount and default markup per supplier. These are applied automatically when importing products.
        </p>

        <div className="space-y-3 mt-2">
          {settings.map((s) => (
            <div key={s.id} className="flex items-center gap-2 text-sm">
              <span className="flex-1 font-medium truncate">{s.supplier_name}</span>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  className="w-16 h-8 text-xs"
                  value={s.discount_percent}
                  onChange={(e) =>
                    upsertSetting.mutate({
                      supplier_name: s.supplier_name,
                      discount_percent: parseFloat(e.target.value) || 0,
                      default_markup_percent: s.default_markup_percent,
                    })
                  }
                />
                <span className="text-xs text-muted-foreground">%disc</span>
              </div>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  className="w-16 h-8 text-xs"
                  value={s.default_markup_percent}
                  onChange={(e) =>
                    upsertSetting.mutate({
                      supplier_name: s.supplier_name,
                      discount_percent: s.discount_percent,
                      default_markup_percent: parseFloat(e.target.value) || 30,
                    })
                  }
                />
                <span className="text-xs text-muted-foreground">%mkup</span>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteSetting.mutate(s.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}

          <div className="border-t border-border pt-3">
            <Label className="text-xs">Add Supplier</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input placeholder="Supplier name" value={newName} onChange={(e) => setNewName(e.target.value)} className="flex-1 h-8 text-sm" />
              <Input type="number" placeholder="Disc %" value={newDiscount} onChange={(e) => setNewDiscount(e.target.value)} className="w-16 h-8 text-xs" />
              <Input type="number" placeholder="Mkup %" value={newMarkup} onChange={(e) => setNewMarkup(e.target.value)} className="w-16 h-8 text-xs" />
              <Button size="icon" className="h-8 w-8" onClick={handleAdd} disabled={!newName.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
