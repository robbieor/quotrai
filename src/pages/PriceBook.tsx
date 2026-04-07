import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Plus, Settings2, BookOpen } from "lucide-react";
import { usePricebooks } from "@/hooks/usePricebooks";
import { EmptyState } from "@/components/shared/EmptyState";
import { PricebookCard } from "@/components/pricebook/PricebookCard";
import { AddPriceSourceDialog } from "@/components/pricebook/AddPriceSourceDialog";
import { WebsiteImportWizard } from "@/components/pricebook/WebsiteImportWizard";
import { ManualCatalogDialog } from "@/components/pricebook/ManualCatalogDialog";
import { CsvImportDialog } from "@/components/pricebook/CsvImportDialog";
import { SupplierSettingsDialog } from "@/components/pricebook/SupplierSettingsDialog";
import { SupplierDirectoryBrowser } from "@/components/pricebook/SupplierDirectoryBrowser";
import { RequestSupplierForm } from "@/components/pricebook/RequestSupplierForm";
import { PricebookOnboarding } from "@/components/pricebook/PricebookOnboarding";
import { useQueryClient } from "@tanstack/react-query";

export default function PriceBook() {
  const { pricebooks, isLoading, deletePricebook } = usePricebooks();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showAddSource, setShowAddSource] = useState(false);
  const [showWebsiteWizard, setShowWebsiteWizard] = useState(false);
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [showSupplierSettings, setShowSupplierSettings] = useState(false);
  const [showDirectoryBrowser, setShowDirectoryBrowser] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);

  const handleSourceSelect = (type: "supplier_directory" | "csv" | "manual" | "ai_extract") => {
    if (type === "supplier_directory") setShowDirectoryBrowser(true);
    else if (type === "ai_extract") setShowWebsiteWizard(true);
    else if (type === "csv") setShowCsvImport(true);
    else setShowManualDialog(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-[28px] font-bold tracking-[-0.02em]">Price Book</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Your supplier catalogs and pricing libraries
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowSupplierSettings(true)}>
              <Settings2 className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Supplier Settings</span>
            </Button>
            <Button size="sm" onClick={() => setShowAddSource(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add Price Source
            </Button>
          </div>
        </div>

        {/* Onboarding guide */}
        <PricebookOnboarding />

        {/* Pricebook grid */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading catalogs...</div>
        ) : pricebooks.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No price sources yet"
            description="Browse our supplier directory, import from any website with AI, upload CSV price lists, or create manual catalogs."
            actionLabel="Add Price Source"
            onAction={() => setShowAddSource(true)}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pricebooks.map((pb) => (
              <PricebookCard
                key={pb.id}
                pricebook={pb}
                onClick={() => navigate(`/price-book/${pb.id}`)}
                onDelete={() => deletePricebook.mutate(pb.id)}
              />
            ))}
          </div>
        )}

        <div className="pb-24" />
      </div>

      {/* Dialogs */}
      <AddPriceSourceDialog
        open={showAddSource}
        onOpenChange={setShowAddSource}
        onSelect={handleSourceSelect}
      />

      <SupplierDirectoryBrowser
        open={showDirectoryBrowser}
        onOpenChange={setShowDirectoryBrowser}
        onSelectSupplier={(supplier, method) => {
          setShowDirectoryBrowser(false);
          if (method === "csv") setShowCsvImport(true);
          else if (method === "ai_extract") setShowWebsiteWizard(true);
          else if (method === "catalog") setShowWebsiteWizard(true);
          else setShowManualDialog(true);
        }}
        onRequestSupplier={() => setShowRequestForm(true)}
      />

      <RequestSupplierForm
        open={showRequestForm}
        onOpenChange={setShowRequestForm}
      />

      <WebsiteImportWizard
        open={showWebsiteWizard}
        onOpenChange={setShowWebsiteWizard}
        onComplete={() => queryClient.invalidateQueries({ queryKey: ["pricebooks"] })}
      />

      <ManualCatalogDialog
        open={showManualDialog}
        onOpenChange={setShowManualDialog}
        onComplete={() => queryClient.invalidateQueries({ queryKey: ["pricebooks"] })}
      />

      <CsvImportDialog
        open={showCsvImport}
        onOpenChange={setShowCsvImport}
        onComplete={() => queryClient.invalidateQueries({ queryKey: ["pricebooks"] })}
      />

      <SupplierSettingsDialog
        open={showSupplierSettings}
        onOpenChange={setShowSupplierSettings}
      />
    </DashboardLayout>
  );
}
