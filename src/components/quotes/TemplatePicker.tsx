import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Search, 
  FileText, 
  Star, 
  Clock,
  Wrench
} from "lucide-react";
import { useTemplates, Template, getTradeCategoryLabel, TRADE_CATEGORIES, TradeCategory } from "@/hooks/useTemplates";
import { useUserTradeCategory } from "@/hooks/useUserTradeCategory";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface TemplatePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (items: Array<{ description: string; quantity: number; unit_price: number; cost_price?: number; margin_percent?: number; catalog_item_id?: string | null; line_group?: string }>, displayMode?: string) => void;
}

export function TemplatePicker({ open, onOpenChange, onSelect }: TemplatePickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const userTradeCategory = useUserTradeCategory();
  const [selectedCategory, setSelectedCategory] = useState<TradeCategory | "all">("all");
  const [loadingTemplate, setLoadingTemplate] = useState<string | null>(null);
  
  // Set default category to user's trade when dialog opens
  useEffect(() => {
    if (open && userTradeCategory) {
      setSelectedCategory(userTradeCategory);
    }
  }, [open, userTradeCategory]);
  
  const { data: templates, isLoading } = useTemplates(
    selectedCategory === "all" ? undefined : selectedCategory
  );

  const filteredTemplates = templates?.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectTemplate = async (template: Template) => {
    setLoadingTemplate(template.id);
    
    try {
      // Fetch template items
      const { data: items, error } = await supabase
        .from("template_items")
        .select("*")
        .eq("template_id", template.id)
        .order("sort_order");

      if (error) throw error;

      if (items && items.length > 0) {
        const lineItems = items.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity),
          unit_price: Number(item.sell_price) || Number(item.unit_price),
          cost_price: Number(item.cost_price) || 0,
          margin_percent: Number(item.margin_percent) || 0,
          catalog_item_id: item.catalog_item_id || null,
          line_group: item.line_group || "Other",
        }));
        onSelect(lineItems, (template as any).default_display_mode);
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Failed to load template items:", error);
    } finally {
      setLoadingTemplate(null);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "electrician":
        return "⚡";
      case "plumber":
        return "🔧";
      case "hvac":
        return "❄️";
      case "carpenter":
        return "🪚";
      case "painter":
        return "🎨";
      case "roofer":
        return "🏠";
      case "landscaper":
        return "🌳";
      default:
        return "📋";
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-IE", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Use Template
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 flex flex-col min-h-0">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-1.5">
            <Button
              variant={selectedCategory === "all" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setSelectedCategory("all")}
            >
              All
            </Button>
            {TRADE_CATEGORIES.map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setSelectedCategory(cat)}
              >
                <span className="mr-1">{getCategoryIcon(cat)}</span>
                {getTradeCategoryLabel(cat)}
              </Button>
            ))}
          </div>

          {/* Template List */}
          <ScrollArea className="flex-1 -mx-6 px-6">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-lg" />
                ))}
              </div>
            ) : filteredTemplates?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Wrench className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No templates found</p>
                <p className="text-sm">Try adjusting your search or category</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTemplates?.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleSelectTemplate(template)}
                    disabled={loadingTemplate === template.id}
                    className={cn(
                      "w-full text-left p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors",
                      "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                      loadingTemplate === template.id && "opacity-50 cursor-wait"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getCategoryIcon(template.category)}</span>
                          <h4 className="font-medium truncate">{template.name}</h4>
                          {template.is_favorite && (
                            <Star className="h-3.5 w-3.5 text-warning fill-warning flex-shrink-0" />
                          )}
                        </div>
                        {template.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                            {template.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {getTradeCategoryLabel(template.category)}
                          </Badge>
                          {template.estimated_duration && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {template.estimated_duration}h
                            </span>
                          )}
                          {template.labour_rate_default && (
                            <span className="text-xs text-muted-foreground">
                              {formatCurrency(template.labour_rate_default)}/hr
                            </span>
                          )}
                        </div>
                      </div>
                      <Button 
                        variant="secondary" 
                        size="sm"
                        disabled={loadingTemplate === template.id}
                      >
                        {loadingTemplate === template.id ? "Loading..." : "Use"}
                      </Button>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
