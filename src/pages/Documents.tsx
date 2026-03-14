import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FolderOpen, FileCheck } from "lucide-react";
import TemplatesTab from "@/components/documents/TemplatesTab";
import CertificatesTab from "@/components/documents/CertificatesTab";

export default function Documents() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "templates");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && (tab === "templates" || tab === "certificates")) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="animate-fade-up">
          <h1 className="text-display font-bold tracking-tight text-foreground">
            Templates
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage quote templates and compliance certificates for your business.
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="certificates" className="flex items-center gap-2">
              <FileCheck className="h-4 w-4" />
              Certificates
            </TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="mt-0">
            <TemplatesTab />
          </TabsContent>

          <TabsContent value="certificates" className="mt-0">
            <CertificatesTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
