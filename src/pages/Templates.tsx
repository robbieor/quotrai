import { useState, useEffect } from "react";
import { format } from "date-fns";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, FileText } from "lucide-react";
import { TemplateFormDialog } from "@/components/templates/TemplateFormDialog";
import { TemplatesTable } from "@/components/templates/TemplatesTable";
import { DeleteTemplateDialog } from "@/components/templates/DeleteTemplateDialog";
import { 
  useTemplates, 
  useSeedTemplates,
  Template, 
  TRADE_CATEGORIES, 
  getTradeCategoryLabel,
  TradeCategory 
} from "@/hooks/useTemplates";
import { useUserTradeCategory } from "@/hooks/useUserTradeCategory";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function Templates() {
  const userTradeCategory = useUserTradeCategory();
  const [selectedCategory, setSelectedCategory] = useState<TradeCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [deleteTemplate, setDeleteTemplate] = useState<Template | null>(null);
  const [hasInitializedCategory, setHasInitializedCategory] = useState(false);
  
  const navigate = useNavigate();
  
  // Set default category to user's trade on first load
  useEffect(() => {
    if (userTradeCategory && !hasInitializedCategory) {
      setSelectedCategory(userTradeCategory);
      setHasInitializedCategory(true);
    }
  }, [userTradeCategory, hasInitializedCategory]);

  // Filter visible category tabs: only show user's trade + general, or all if no trade set
  const visibleCategories = userTradeCategory
    ? TRADE_CATEGORIES.filter(cat => cat === userTradeCategory || cat === "general")
    : TRADE_CATEGORIES;
  
  const { data: templates, isLoading } = useTemplates(
    selectedCategory === "all" ? undefined : selectedCategory
  );
  const seedTemplates = useSeedTemplates();
  
  const hasNoTemplates = !isLoading && (!templates || templates.length === 0);

  const filteredTemplates = templates?.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = async (template: Template) => {
    // Fetch full template with items
    const { data: fullTemplate } = await import("@/integrations/supabase/client").then(
      ({ supabase }) =>
        supabase
          .from("templates")
          .select("*")
          .eq("id", template.id)
          .single()
          .then(async (res) => {
            if (res.data) {
              const { data: items } = await supabase
                .from("template_items")
                .select("*")
                .eq("template_id", template.id)
                .order("sort_order");
              return { data: { ...res.data, items } };
            }
            return res;
          })
    );
    
    setEditingTemplate(fullTemplate as Template);
    setFormOpen(true);
  };

  const handleUseTemplate = async (template: Template) => {
    // Store template in session storage and navigate to quotes
    sessionStorage.setItem("useTemplate", template.id);
    toast.success(`Template "${template.name}" ready to use`);
    navigate("/quotes?new=true");
  };

  return (
    <DashboardLayout>
      <div className="space-y-3">
        {/* Compact Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <h1 className="text-lg font-bold tracking-tight text-foreground shrink-0">
            Templates
          </h1>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <div className="flex gap-2 ml-auto">
            <Button size="sm" className="h-8 text-xs" onClick={() => { setEditingTemplate(null); setFormOpen(true); }}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              New Template
            </Button>
          </div>
        </div>

        {/* Category Tabs */}
        <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as TradeCategory | "all")}>
          <TabsList className="overflow-x-auto flex-nowrap h-auto gap-0.5 bg-muted/50 p-0.5 justify-start w-full">
            <TabsTrigger value="all" className="text-xs h-7 px-2.5">All</TabsTrigger>
            {visibleCategories.map((cat) => (
              <TabsTrigger key={cat} value={cat} className="text-xs h-7 px-2.5">
                {getTradeCategoryLabel(cat)}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={selectedCategory} className="mt-3">
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-lg" />
                ))}
              </div>
            ) : filteredTemplates?.length === 0 ? (
              <div className="text-center py-16 rounded-lg border border-border/60 bg-card">
                <div className="mx-auto h-16 w-16 rounded-xl bg-muted flex items-center justify-center mb-4">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-1">No templates yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first template to speed up quote creation.
                </p>
                <Button onClick={() => { setEditingTemplate(null); setFormOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </div>
            ) : (
              <TemplatesTable
                templates={filteredTemplates || []}
                onEdit={handleEdit}
                onDelete={setDeleteTemplate}
                onUse={handleUseTemplate}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>

      <TemplateFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        template={editingTemplate}
      />

      <DeleteTemplateDialog
        template={deleteTemplate}
        open={!!deleteTemplate}
        onOpenChange={(open) => !open && setDeleteTemplate(null)}
      />
    </DashboardLayout>
  );
}
