import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * Hook that detects ?topup=success&session_id=xxx in the URL,
 * verifies the payment with the backend, and credits the minutes.
 */
export function useVoiceTopupVerification() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const verifiedRef = useRef(false);

  useEffect(() => {
    const topupStatus = searchParams.get("topup");
    const sessionId = searchParams.get("session_id");

    if (topupStatus === "cancelled") {
      toast.info("Top-up cancelled.");
      setSearchParams({}, { replace: true });
      return;
    }

    if (topupStatus !== "success" || !sessionId || verifiedRef.current) return;
    verifiedRef.current = true;

    (async () => {
      try {
        toast.loading("Verifying your purchase...", { id: "topup-verify" });

        const { data, error } = await supabase.functions.invoke("verify-voice-topup", {
          body: { session_id: sessionId },
        });

        if (error) throw error;

        if (data?.success && !data?.already_processed) {
          toast.success(`${data.minutes_added} minutes added to your account!`, { id: "topup-verify" });
        } else if (data?.already_processed) {
          toast.info("This purchase was already processed.", { id: "topup-verify" });
        } else {
          toast.error(data?.message || "Payment verification failed.", { id: "topup-verify" });
        }

        // Refresh usage data
        queryClient.invalidateQueries({ queryKey: ["teamGeorgeData"] });
        queryClient.invalidateQueries({ queryKey: ["voiceMinutePurchases"] });
        queryClient.invalidateQueries({ queryKey: ["george-usage-history"] });
      } catch (err: any) {
        console.error("Topup verification failed:", err);
        toast.error("Failed to verify purchase. Please contact support.", { id: "topup-verify" });
      } finally {
        // Clean up URL params
        setSearchParams({}, { replace: true });
      }
    })();
  }, [searchParams, setSearchParams, queryClient]);
}
