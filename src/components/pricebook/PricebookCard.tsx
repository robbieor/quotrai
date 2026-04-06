import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Globe, Upload, Package, Trash2, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Pricebook } from "@/hooks/usePricebooks";
import { formatDistanceToNow } from "date-fns";

interface PricebookCardProps {
  pricebook: Pricebook;
  onClick: () => void;
  onDelete: () => void;
}

const sourceIcons = {
  website: Globe,
  csv: Upload,
  manual: Package,
};

export function PricebookCard({ pricebook, onClick, onDelete }: PricebookCardProps) {
  const Icon = sourceIcons[pricebook.source_type as keyof typeof sourceIcons] || Package;

  return (
    <Card
      className="group cursor-pointer hover:border-primary/30 hover:shadow-md transition-all"
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">{pricebook.name}</p>
              {pricebook.supplier_name && (
                <p className="text-xs text-muted-foreground">{pricebook.supplier_name}</p>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2 mt-3">
          <Badge variant="secondary" className="text-[10px]">
            {pricebook.item_count} item{pricebook.item_count !== 1 ? "s" : ""}
          </Badge>
          {pricebook.trade_type && (
            <Badge variant="outline" className="text-[10px]">{pricebook.trade_type}</Badge>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground mt-3">
          {pricebook.last_synced_at
            ? `Synced ${formatDistanceToNow(new Date(pricebook.last_synced_at), { addSuffix: true })}`
            : `Created ${formatDistanceToNow(new Date(pricebook.created_at), { addSuffix: true })}`
          }
        </p>
      </CardContent>
    </Card>
  );
}
