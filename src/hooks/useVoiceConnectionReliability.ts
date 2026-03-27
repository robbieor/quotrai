import { useRef, useCallback } from "react";

const MAX_RETRIES = 2;
const INITIAL_RETRY_DELAY = 500;

interface RetryState {
  attempts: number;
  lastAttempt: number;
}

export function useVoiceConnectionReliability() {
  const retryStateRef = useRef<RetryState>({ attempts: 0, lastAttempt: 0 });

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
    withRetry,
    resetRetryState,
    MAX_RETRIES,
  };
}
