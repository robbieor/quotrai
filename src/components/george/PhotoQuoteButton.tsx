import { useState, useRef } from "react";
import { Camera, Loader2, X } from "lucide-react";
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
    material_name?: string;
  }>;
  subtotal: number;
  estimated_duration_hours: number;
  notes: string;
  follow_up_questions: string[];
  currency: string;
  image_url: string;
  image_urls?: string[];
}

export function PhotoQuoteButton({ onQuoteSuggestion, disabled }: PhotoQuoteButtonProps) {
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate files (max 5)
    const validFiles = files.slice(0, 5).filter((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    // Show previews
    const previewUrls: string[] = [];
    for (const file of validFiles) {
      const url = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      previewUrls.push(url);
    }
    setPreviews(previewUrls);
    setIsAnalysing(true);

    try {
      // Upload all photos in parallel
      const uploadPromises = validFiles.map(async (file) => {
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("george-photos")
          .upload(fileName, file, { contentType: file.type });
        if (uploadError) throw uploadError;

        const { data: urlData } = await supabase.storage
          .from("george-photos")
          .createSignedUrl(uploadData.path, 600);
        if (!urlData?.signedUrl) throw new Error("Failed to get image URL");
        return urlData.signedUrl;
      });

      const imageUrls = await Promise.all(uploadPromises);

      // Call the photo-quote edge function with all image URLs
      const { data, error } = await supabase.functions.invoke("george-photo-quote", {
        body: {
          image_url: imageUrls[0],
          image_urls: imageUrls,
        },
      });

      if (error) throw error;

      if (data?.success && data?.quote_suggestion) {
        onQuoteSuggestion({
          ...data.quote_suggestion,
          currency: data.currency || "EUR",
          image_url: imageUrls[0],
          image_urls: imageUrls,
        });
      } else if (data?.error) {
        toast.error(data.error);
      }
    } catch (err) {
      console.error("Photo quote error:", err);
      toast.error("Failed to analyse photo. Try again with a clearer image.");
    } finally {
      setIsAnalysing(false);
      setPreviews([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (previews.length > 0 && isAnalysing) {
    return (
      <div className="flex items-center gap-1">
        {previews.slice(0, 3).map((p, i) => (
          <div key={i} className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-primary animate-pulse" style={{ marginLeft: i > 0 ? "-8px" : 0, zIndex: 3 - i }}>
            <img src={p} alt={`Analysing ${i + 1}`} className="w-full h-full object-cover" />
          </div>
        ))}
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-4 w-4 text-primary animate-spin" />
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
        multiple
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
        title="Photo Quote — snap up to 5 photos to auto-generate a quote"
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
