import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Edit2, Trash2, Copy } from "lucide-react";
import { Template, getTradeCategoryLabel, useToggleFavorite } from "@/hooks/useTemplates";

interface TemplateCardProps {
  template: Template;
  onEdit: (template: Template) => void;
  onDelete: (template: Template) => void;
  onUse: (template: Template) => void;
}

export function TemplateCard({ template, onEdit, onDelete, onUse }: TemplateCardProps) {
  const toggleFavorite = useToggleFavorite();

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite.mutate({ id: template.id, is_favorite: !template.is_favorite });
  };

  return (
    <Card className="group hover:border-primary/30 transition-all duration-200">
      <CardContent className="pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground truncate">{template.name}</h3>
              {template.is_favorite && (
                <Star className="h-4 w-4 text-primary fill-primary flex-shrink-0" />
              )}
            </div>
            <Badge variant="secondary" className="text-xs">
              {getTradeCategoryLabel(template.category)}
            </Badge>
            {template.description && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {template.description}
              </p>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleToggleFavorite}
          >
            <Star
              className={`h-4 w-4 ${
                template.is_favorite ? "text-primary fill-primary" : "text-muted-foreground"
              }`}
            />
          </Button>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => onEdit(template)}>
              <Edit2 className="h-3.5 w-3.5 mr-1" />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => onDelete(template)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Delete
            </Button>
          </div>

          <Button size="sm" onClick={() => onUse(template)}>
            <Copy className="h-3.5 w-3.5 mr-1" />
            Use Template
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
