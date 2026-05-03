import { useState } from "react";
import { Check, FileText, HelpCircle, Sparkles, ChevronDown, ChevronUp, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { PhotoQuoteSuggestion } from "./PhotoQuoteButton";

interface PhotoQuoteCardProps {
  suggestion: PhotoQuoteSuggestion;
  onCreateQuote: (suggestion: PhotoQuoteSuggestion) => void;
  onDismiss: () => void;
}

export function PhotoQuoteCard({ suggestion, onCreateQuote, onDismiss }: PhotoQuoteCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const confidenceColor = {
    high: "bg-primary/10 text-primary border-primary/20",
    medium: "bg-accent/20 text-accent-foreground border-accent/20",
    low: "bg-destructive/10 text-destructive border-destructive/20",
  };

  const currencySymbol = suggestion.currency === "GBP" ? "£" : suggestion.currency === "USD" ? "$" : "€";
  const photos = suggestion.image_urls || (suggestion.image_url ? [suggestion.image_url] : []);

  return (
    <>
      <Card className="border-primary/30 bg-primary/5 overflow-hidden">
        <CardHeader className="pb-2 px-4 pt-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
              <CardTitle className="text-sm font-semibold">AI Quote Suggestion</CardTitle>
              <Badge variant="outline" className={cn("text-[10px]", confidenceColor[suggestion.confidence])}>
                {suggestion.confidence} confidence
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{suggestion.job_type}</p>
          {suggestion.matched_template && (
            <p className="text-[10px] text-primary">Matched template: {suggestion.matched_template}</p>
          )}
        </CardHeader>

        {expanded && (
          <CardContent className="px-4 pb-4 space-y-3">
            {/* Photo gallery */}
            {photos.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {photos.map((url, idx) => (
                  <button
                    key={idx}
                    className="shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 border-border hover:border-primary transition-colors"
                    onClick={() => setSelectedPhoto(url)}
                  >
                    <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
                {photos.length > 1 && (
                  <div className="flex items-center text-[10px] text-muted-foreground pl-1">
                    <ImageIcon className="h-3 w-3 mr-0.5" />
                    {photos.length} photos
                  </div>
                )}
              </div>
            )}

            <p className="text-xs text-foreground">{suggestion.description}</p>

            <Separator />

            {/* Line Items */}
            <div className="space-y-1.5">
              {suggestion.line_items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start gap-2 text-xs">
                  <div className="flex-1">
                    <span className="text-foreground">{item.description}</span>
                    {item.is_material && (
                      <Badge variant="secondary" className="ml-1.5 text-[9px] py-0 px-1">
                        {item.material_name || "Material"}
                      </Badge>
                    )}
                  </div>
                  <span className="text-muted-foreground shrink-0">
                    {item.quantity} × {currencySymbol}{item.unit_price.toFixed(2)}
                  </span>
                  <span className="font-medium text-foreground shrink-0 w-16 text-right">
                    {currencySymbol}{(item.quantity * item.unit_price).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <Separator />

            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-foreground">Subtotal</span>
              <span className="text-sm font-bold text-primary">
                {currencySymbol}{suggestion.subtotal.toFixed(2)}
              </span>
            </div>

            {suggestion.estimated_duration_hours > 0 && (
              <p className="text-[10px] text-muted-foreground">
                Est. duration: {suggestion.estimated_duration_hours}h
              </p>
            )}

            {suggestion.notes && (
              <p className="text-[10px] text-muted-foreground italic">💡 {suggestion.notes}</p>
            )}

            {/* Follow-up Questions */}
            {suggestion.follow_up_questions?.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-2.5 space-y-1">
                <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                  <HelpCircle className="h-3 w-3" />
                  Revamo AI needs to confirm:
                </div>
                {suggestion.follow_up_questions.map((q, idx) => (
                  <p key={idx} className="text-[10px] text-muted-foreground">• {q}</p>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                className="flex-1 h-8 text-xs"
                onClick={() => onCreateQuote(suggestion)}
              >
                <FileText className="h-3.5 w-3.5 mr-1.5" />
                Create Quote
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={onDismiss}
              >
                Dismiss
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Full-size photo viewer */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <img
            src={selectedPhoto}
            alt="Full size"
            className="max-w-full max-h-[80vh] rounded-lg shadow-lg object-contain"
          />
        </div>
      )}
    </>
  );
}
