import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BuyMoreMinutesButtonProps {
  className?: string;
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm" | "lg";
}

export function BuyMoreMinutesButton({ className, variant = "default", size = "sm" }: BuyMoreMinutesButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleBuyMinutes = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-voice-topup-checkout", {
        body: { minutes: 30 },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: any) {
      console.error("Failed to create checkout:", err);
      toast.error("Failed to start checkout. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleBuyMinutes}
      disabled={isLoading}
      className={className}
    >
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Zap className="mr-2 h-4 w-4" />
      )}
      Buy 30 mins — €7.29
    </Button>
  );
}
