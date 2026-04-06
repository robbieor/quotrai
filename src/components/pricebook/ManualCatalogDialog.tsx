import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TRADE_CATEGORY_MAP } from "@/data/tradeCategoryMap";
import { usePricebooks, type Pricebook } from "@/hooks/usePricebooks";

interface ManualCatalogDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onComplete: (pb: Pricebook) => void;
}

export function ManualCatalogDialog({ open, onOpenChange, onComplete }: ManualCatalogDialogProps) {
  const [name, setName] = useState("");
  const [tradeType, setTradeType] = useState("Electrical");
  const { createPricebook } = usePricebooks();

  const handleCreate = async () => {
    if (!name.trim()) return;
    const pb = await createPricebook.mutateAsync({
      name: name.trim(),
      supplier_name: null,
      source_type: "manual",
      source_url: null,
      trade_type: tradeType,
      last_synced_at: null,
    });
    if (pb) onComplete(pb as unknown as Pricebook);
    setName("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Create Manual Catalog</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Catalog Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Custom Items" className="mt-1" autoFocus />
          </div>
          <div>
            <Label>Trade Type</Label>
            <Select value={tradeType} onValueChange={setTradeType}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.keys(TRADE_CATEGORY_MAP).map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!name.trim()}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
