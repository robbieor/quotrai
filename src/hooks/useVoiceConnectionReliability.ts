import { useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 2000; // 2 seconds (was 1s - too aggressive)
const HEALTH_CHECK_INTERVAL = 60000; // 60 seconds (was 30s - caused toast spam)
const CONNECTION_TIMEOUT = 15000; // 15 seconds (was 10s - too tight)

interface RetryState {
  attempts: number;
  lastAttempt: number;
}

interface UseVoiceConnectionReliabilityOptions {
  onRetryAttempt?: (attempt: number, maxRetries: number) => void;
  onRetryExhausted?: () => void;
  onConnectionRestored?: () => void;
  onHealthCheckFailed?: () => void;
}

export function useVoiceConnectionReliability(
  options: UseVoiceConnectionReliabilityOptions = {}
) {
  const retryStateRef = useRef<RetryState>({ attempts: 0, lastAttempt: 0 });
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMonitoringRef = useRef(false);

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
        return { success: true, usePublicAgent: true }; // Fall back to public agent
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

      // Check if it's a network error vs API error
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
      context?: string
    ): Promise<{ success: boolean; result?: T; error?: unknown }> => {
      retryStateRef.current = { attempts: 0, lastAttempt: Date.now() };

      while (retryStateRef.current.attempts < MAX_RETRIES) {
        const attempt = retryStateRef.current.attempts + 1;
        console.log(
          `[VoiceReliability] Attempt ${attempt}/${MAX_RETRIES}${context ? ` (${context})` : ""}`
        );

        try {
          options.onRetryAttempt?.(attempt, MAX_RETRIES);
          const result = await fn();
          
          // Reset retry state on success
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
            options.onRetryExhausted?.();
            return { success: false, error };
          }

          // Exponential backoff: 1s, 2s, 4s
          const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryStateRef.current.attempts - 1);
          console.log(`[VoiceReliability] Waiting ${delay}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      return { success: false, error: new Error("Max retries exceeded") };
    },
    [options]
  );

  /**
   * Start connection health monitoring
   */
  const startHealthMonitoring = useCallback(
    (
      checkConnection: () => boolean,
      onDisconnected: () => Promise<void>
    ) => {
      if (isMonitoringRef.current) {
        console.log("[VoiceReliability] Health monitoring already active");
        return;
      }

      console.log("[VoiceReliability] 🏥 Starting health monitoring...");
      isMonitoringRef.current = true;

      healthCheckIntervalRef.current = setInterval(async () => {
        const isConnected = checkConnection();
        
        if (!isConnected && isMonitoringRef.current) {
          // Only attempt recovery if we were previously connected (not on initial load)
          const timeSinceLastAttempt = Date.now() - retryStateRef.current.lastAttempt;
          if (timeSinceLastAttempt < 5000) {
            // Debounce: skip if we just attempted recently
            return;
          }
          
          console.warn("[VoiceReliability] ⚠️ Connection lost, attempting recovery...");
          options.onHealthCheckFailed?.();

          try {
            retryStateRef.current.lastAttempt = Date.now();
            await onDisconnected();
            console.log("[VoiceReliability] ✅ Connection restored");
            options.onConnectionRestored?.();
          } catch (error) {
            console.error("[VoiceReliability] ❌ Failed to restore connection:", error);
            // Stop monitoring after failed recovery to prevent infinite loops
            stopHealthMonitoring();
          }
        }
      }, HEALTH_CHECK_INTERVAL);
    },
    [options]
  );

  /**
   * Stop health monitoring
   */
  const stopHealthMonitoring = useCallback(() => {
    if (healthCheckIntervalRef.current) {
      console.log("[VoiceReliability] Stopping health monitoring");
      clearInterval(healthCheckIntervalRef.current);
      healthCheckIntervalRef.current = null;
    }
    isMonitoringRef.current = false;
  }, []);

  /**
   * Reset retry counter (call after successful connection)
   */
  const resetRetryState = useCallback(() => {
    retryStateRef.current = { attempts: 0, lastAttempt: 0 };
  }, []);

  /**
   * Get current retry state
   */
  const getRetryState = useCallback(() => {
    return { ...retryStateRef.current, maxRetries: MAX_RETRIES };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopHealthMonitoring();
    };
  }, [stopHealthMonitoring]);

  return {
    runPreflightCheck,
    withRetry,
    startHealthMonitoring,
    stopHealthMonitoring,
    resetRetryState,
    getRetryState,
    MAX_RETRIES,
  };
}
