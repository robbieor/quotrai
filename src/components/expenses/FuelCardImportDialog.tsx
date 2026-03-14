import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Fuel } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const FUEL_CARD_PROVIDERS = [
  { id: "circle_k", name: "Circle K", country: "IE", columns: { date: "Transaction Date", amount: "Amount", litres: "Litres", station: "Station", vehicle: "Vehicle Reg" } },
  { id: "dci", name: "DCI Fuel Cards", country: "IE", columns: { date: "Date", amount: "Net Amount", litres: "Quantity", station: "Site Name", vehicle: "Registration" } },
  { id: "top_oil", name: "Top Oil", country: "IE", columns: { date: "Date", amount: "Amount", litres: "Litres", station: "Location", vehicle: "Vehicle" } },
  { id: "applegreen", name: "Applegreen Fleet", country: "IE", columns: { date: "Transaction Date", amount: "Total", litres: "Volume", station: "Site", vehicle: "Vehicle Reg" } },
  { id: "emo", name: "Emo", country: "IE", columns: { date: "Date", amount: "Amount", litres: "Litres", station: "Station", vehicle: "Vehicle" } },
  { id: "allstar", name: "Allstar / Radius", country: "UK", columns: { date: "Transaction Date", amount: "Net Value", litres: "Quantity", station: "Site Name", vehicle: "Vehicle Registration" } },
  { id: "shell", name: "Shell Fleet Hub", country: "UK", columns: { date: "Date", amount: "Net Amount", litres: "Quantity", station: "Station", vehicle: "Registration" } },
  { id: "bp", name: "BP Plus", country: "UK", columns: { date: "Transaction Date", amount: "Net Amount", litres: "Quantity", station: "Site", vehicle: "Registration" } },
  { id: "generic", name: "Generic CSV", country: "ALL", columns: { date: "date", amount: "amount", litres: "litres", station: "station", vehicle: "vehicle" } },
] as const;

interface ImportResult {
  success: boolean;
  imported: number;
  errors: string[];
  warnings: string[];
}

interface FuelCardImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FuelCardImportDialog({ open, onOpenChange }: FuelCardImportDialogProps) {
  const [provider, setProvider] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: async ({ provider, csvContent }: { provider: string; csvContent: string }) => {
      const { data, error } = await supabase.functions.invoke("import-fuel-card", {
        body: { provider, csv_content: csvContent },
      });
      if (error) throw error;
      return data as ImportResult;
    },
    onSuccess: (data) => {
      setResult(data);
      if (data.imported > 0) {
        queryClient.invalidateQueries({ queryKey: ["expenses"] });
        toast.success(`Imported ${data.imported} fuel expense${data.imported > 1 ? "s" : ""}`);
      }
    },
    onError: (error) => {
      toast.error("Import failed: " + error.message);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!file || !provider) return;

    const text = await file.text();
    importMutation.mutate({ provider, csvContent: text });
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setFile(null);
      setProvider("");
      setResult(null);
    }
    onOpenChange(open);
  };

  const selectedProvider = FUEL_CARD_PROVIDERS.find((p) => p.id === provider);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Fuel className="h-5 w-5" />
            Import Fuel Card Statement
          </DialogTitle>
          <DialogDescription>
            Upload a CSV export from your fuel card provider to automatically log fuel expenses.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Provider Selection */}
          <div className="space-y-2">
            <Label>Fuel Card Provider</Label>
            <Select value={provider} onValueChange={(v) => { setProvider(v); setResult(null); }}>
              <SelectTrigger>
                <SelectValue placeholder="Select your provider" />
              </SelectTrigger>
              <SelectContent>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Ireland 🇮🇪</div>
                {FUEL_CARD_PROVIDERS.filter((p) => p.country === "IE").map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-1">UK 🇬🇧</div>
                {FUEL_CARD_PROVIDERS.filter((p) => p.country === "UK").map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-1">Other</div>
                {FUEL_CARD_PROVIDERS.filter((p) => p.country === "ALL").map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Expected columns hint */}
          {selectedProvider && selectedProvider.id !== "generic" && (
            <div className="rounded-lg border bg-muted/50 p-3 text-sm">
              <p className="font-medium mb-1">Expected CSV columns for {selectedProvider.name}:</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.values(selectedProvider.columns).map((col) => (
                  <Badge key={col} variant="secondary" className="text-xs">{col}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* File Upload */}
          <div className="space-y-2">
            <Label>CSV File</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
            {file ? (
              <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/50">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                <span className="flex-1 text-sm truncate">{file.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { setFile(null); setResult(null); }}
                >
                  Change
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                Choose CSV File
              </Button>
            )}
          </div>

          {/* Result display */}
          {result && (
            <div className="rounded-lg border p-3 space-y-2">
              {result.imported > 0 && (
                <div className="flex items-center gap-2 text-sm text-primary">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{result.imported} expense{result.imported > 1 ? "s" : ""} imported successfully</span>
                </div>
              )}
              {result.warnings.map((w, i) => (
                <div key={`w-${i}`} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{w}</span>
                </div>
              ))}
              {result.errors.map((e, i) => (
                <div key={`e-${i}`} className="flex items-start gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{e}</span>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => handleClose(false)}>
              {result?.imported ? "Done" : "Cancel"}
            </Button>
            {!result?.imported && (
              <Button
                onClick={handleImport}
                disabled={!file || !provider || importMutation.isPending}
              >
                {importMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Import Expenses
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
