import { useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 2000;
const CONNECTION_TIMEOUT = 15000;

interface RetryState {
  attempts: number;
  lastAttempt: number;
}

export function useVoiceConnectionReliability() {
  const retryStateRef = useRef<RetryState>({ attempts: 0, lastAttempt: 0 });

  /**
   * Pre-flight check: Test if ElevenLabs API is reachable before attempting connection
   */
  const runPreflightCheck = useCallback(async (): Promise<{
    success: boolean;
    signedUrl?: string;
    usePublicAgent?: boolean;
    error?: string;
  }> => {
    console.log("[VoiceReliability] 🔍 Running pre-flight check...");

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONNECTION_TIMEOUT);

      const { data, error } = await supabase.functions.invoke(
        "elevenlabs-agent-token",
        { body: {} }
      );

      clearTimeout(timeoutId);

      if (error) {
        console.warn("[VoiceReliability] Pre-flight token error:", error);
        return { success: true, usePublicAgent: true };
      }

      if (data?.signedUrl) {
        console.log("[VoiceReliability] ✅ Pre-flight: Signed URL available");
        return { success: true, signedUrl: data.signedUrl };
      }

      if (data?.usePublicAgent || data?.agentId) {
        console.log("[VoiceReliability] ✅ Pre-flight: Public agent available");
        return { success: true, usePublicAgent: true };
      }

      return { success: true, usePublicAgent: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("[VoiceReliability] ❌ Pre-flight failed:", errorMessage);

      if (errorMessage.includes("abort") || errorMessage.includes("timeout")) {
        return { success: false, error: "Connection timeout - please check your network" };
      }

      return { success: false, error: errorMessage };
    }
  }, []);

  /**
   * Execute a function with automatic retry and exponential backoff
   */
  const withRetry = useCallback(
    async <T>(
      fn: () => Promise<T>,
      context?: string,
      onRetryAttempt?: (attempt: number) => void
    ): Promise<{ success: boolean; result?: T; error?: unknown }> => {
      retryStateRef.current = { attempts: 0, lastAttempt: Date.now() };

      while (retryStateRef.current.attempts < MAX_RETRIES) {
        const attempt = retryStateRef.current.attempts + 1;
        console.log(
          `[VoiceReliability] Attempt ${attempt}/${MAX_RETRIES}${context ? ` (${context})` : ""}`
        );

        try {
          onRetryAttempt?.(attempt);
          const result = await fn();
          
          retryStateRef.current = { attempts: 0, lastAttempt: Date.now() };
          console.log(`[VoiceReliability] ✅ Success on attempt ${attempt}`);
          
          return { success: true, result };
        } catch (error) {
          retryStateRef.current.attempts++;
          retryStateRef.current.lastAttempt = Date.now();

          console.warn(
            `[VoiceReliability] Attempt ${attempt} failed:`,
            error instanceof Error ? error.message : error
          );

          if (retryStateRef.current.attempts >= MAX_RETRIES) {
            console.error("[VoiceReliability] ❌ All retry attempts exhausted");
            return { success: false, error };
          }

          const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryStateRef.current.attempts - 1);
          console.log(`[VoiceReliability] Waiting ${delay}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      return { success: false, error: new Error("Max retries exceeded") };
    },
    []
  );

  /**
   * Reset retry counter
   */
  const resetRetryState = useCallback(() => {
    retryStateRef.current = { attempts: 0, lastAttempt: 0 };
  }, []);

  return {
    runPreflightCheck,
    withRetry,
    resetRetryState,
    MAX_RETRIES,
  };
}
