import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Globe, Upload, Package } from "lucide-react";

interface AddPriceSourceDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSelect: (type: "website" | "csv" | "manual") => void;
}

const sources = [
  {
    type: "website" as const,
    icon: Globe,
    title: "Supplier Website",
    desc: "Paste a supplier URL to auto-import products and pricing",
  },
  {
    type: "csv" as const,
    icon: Upload,
    title: "CSV Upload",
    desc: "Upload a distributor or supplier price list CSV",
  },
  {
    type: "manual" as const,
    icon: Package,
    title: "Manual Catalog",
    desc: "Create an empty catalog and add items manually",
  },
];

export function AddPriceSourceDialog({ open, onOpenChange, onSelect }: AddPriceSourceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Price Source</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          {sources.map((s) => (
            <button
              key={s.type}
              onClick={() => { onSelect(s.type); onOpenChange(false); }}
              className="flex items-start gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-accent/30 transition-all text-left"
            >
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">{s.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
