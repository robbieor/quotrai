import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, FileText, Star, Clock, Wrench } from "lucide-react";
import { useTemplates, Template, getTradeCategoryLabel, TRADE_CATEGORIES, TradeCategory } from "@/hooks/useTemplates";
import { useUserTradeCategory } from "@/hooks/useUserTradeCategory";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface TemplatePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (items: Array<{ description: string; quantity: number; unit_price: number }>) => void;
}

export function TemplatePicker({ open, onOpenChange, onSelect }: TemplatePickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const userTradeCategory = useUserTradeCategory();
  const [selectedCategory, setSelectedCategory] = useState<TradeCategory | "all">("all");
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedCategory(userTradeCategory || "all");
      setShowAllCategories(false);
      setSearchQuery("");
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
      const { data: items, error } = await supabase
        .from("template_items")
        .select("*")
        .eq("template_id", template.id)
        .order("sort_order");

      if (error) throw error;

      if (items && items.length > 0) {
        onSelect(items.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
        })));
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Failed to load template items:", error);
    } finally {
      setLoadingTemplate(null);
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      electrician: "⚡", plumber: "🔧", hvac: "❄️", carpenter: "🪚",
      painter: "🎨", roofer: "🏠", landscaper: "🌳",
    };
    return icons[category] || "📋";
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(value);

  const hasUserTrade = !!userTradeCategory;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl px-4 pb-4 pt-0 flex flex-col">
        <SheetHeader className="py-3 border-b border-border -mx-4 px-4 flex-shrink-0">
          <SheetTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Use Template
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-3 pt-3 flex-1 min-h-0">
          {/* Search */}
          <div className="relative flex-shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9 text-sm"
            />
          </div>

          {/* Category filter — compact */}
          <div className="flex-shrink-0">
            {hasUserTrade && !showAllCategories ? (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Showing: <span className="font-medium text-foreground">{getCategoryIcon(userTradeCategory!)} {getTradeCategoryLabel(userTradeCategory!)}</span>
                </span>
                <button
                  onClick={() => { setShowAllCategories(true); setSelectedCategory("all"); }}
                  className="text-xs text-primary hover:underline"
                >
                  Show all trades
                </button>
              </div>
            ) : (
              <Select
                value={selectedCategory}
                onValueChange={(v) => setSelectedCategory(v as TradeCategory | "all")}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {TRADE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {getCategoryIcon(cat)} {getTradeCategoryLabel(cat)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Template List */}
          <ScrollArea className="flex-1 -mx-4 px-4">
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-lg" />
                ))}
              </div>
            ) : filteredTemplates?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Wrench className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No templates found</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredTemplates?.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleSelectTemplate(template)}
                    disabled={loadingTemplate === template.id}
                    className={cn(
                      "w-full text-left p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors",
                      "focus:outline-none focus:ring-2 focus:ring-ring",
                      "active:scale-[0.98]",
                      loadingTemplate === template.id && "opacity-50 cursor-wait"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{getCategoryIcon(template.category)}</span>
                      <h4 className="font-medium text-sm truncate flex-1">{template.name}</h4>
                      {template.is_favorite && (
                        <Star className="h-3.5 w-3.5 text-warning fill-warning flex-shrink-0" />
                      )}
                      {loadingTemplate === template.id && (
                        <span className="text-xs text-muted-foreground">Loading…</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      {!hasUserTrade && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {getTradeCategoryLabel(template.category)}
                        </Badge>
                      )}
                      {template.estimated_duration && (
                        <span className="flex items-center gap-0.5">
                          <Clock className="h-3 w-3" />
                          {template.estimated_duration}h
                        </span>
                      )}
                      {template.labour_rate_default && (
                        <span>{formatCurrency(template.labour_rate_default)}/hr</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
