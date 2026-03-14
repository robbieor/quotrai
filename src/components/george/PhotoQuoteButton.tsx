import { useState, useRef } from "react";
import { Camera, Loader2, X, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PhotoQuoteButtonProps {
  onQuoteSuggestion: (suggestion: PhotoQuoteSuggestion) => void;
  disabled?: boolean;
}

export interface PhotoQuoteSuggestion {
  job_type: string;
  confidence: "high" | "medium" | "low";
  matched_template: string | null;
  description: string;
  line_items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    is_material: boolean;
  }>;
  subtotal: number;
  estimated_duration_hours: number;
  notes: string;
  follow_up_questions: string[];
  currency: string;
  image_url: string;
}

export function PhotoQuoteButton({ onQuoteSuggestion, disabled }: PhotoQuoteButtonProps) {
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB");
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    setIsAnalysing(true);

    try {
      // Upload to storage
      const fileName = `${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("george-photos")
        .upload(fileName, file, { contentType: file.type });

      if (uploadError) throw uploadError;

      // Get a signed URL for the AI to access
      const { data: urlData } = await supabase.storage
        .from("george-photos")
        .createSignedUrl(uploadData.path, 600); // 10 min expiry

      if (!urlData?.signedUrl) throw new Error("Failed to get image URL");

      // Call the photo-quote edge function
      const { data, error } = await supabase.functions.invoke("george-photo-quote", {
        body: { image_url: urlData.signedUrl },
      });

      if (error) throw error;

      if (data?.success && data?.quote_suggestion) {
        onQuoteSuggestion({
          ...data.quote_suggestion,
          currency: data.currency || "EUR",
          image_url: urlData.signedUrl,
        });
      } else if (data?.error) {
        toast.error(data.error);
      }
    } catch (err) {
      console.error("Photo quote error:", err);
      toast.error("Failed to analyse photo. Try again with a clearer image.");
    } finally {
      setIsAnalysing(false);
      setPreview(null);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const clearPreview = () => {
    setPreview(null);
    setIsAnalysing(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (preview && isAnalysing) {
    return (
      <div className="relative">
        <div className="w-9 h-9 md:w-10 md:h-10 rounded-full overflow-hidden border-2 border-primary animate-pulse">
          <img src={preview} alt="Analysing" className="w-full h-full object-cover" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
          <Loader2 className="h-4 w-4 text-white animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelect}
        disabled={disabled || isAnalysing}
      />
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "shrink-0 rounded-full h-9 w-9 md:h-10 md:w-10",
          isAnalysing && "animate-pulse"
        )}
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || isAnalysing}
        title="Photo Quote — snap a photo to auto-generate a quote"
      >
        {isAnalysing ? (
          <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin" />
        ) : (
          <Camera className="h-4 w-4 md:h-5 md:w-5" />
        )}
      </Button>
    </>
  );
}
