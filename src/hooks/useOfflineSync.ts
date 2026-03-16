import { useEffect } from "react";
import { setupOnlineSync } from "@/lib/offlineQueue";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Hook to set up offline queue auto-sync.
 * Call once near the app root (e.g. inside App.tsx).
 */
export function useOfflineSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const cleanup = setupOnlineSync((result) => {
      toast.success(`Synced ${result.synced} offline event${result.synced > 1 ? "s" : ""}`, {
        description: result.failed > 0 ? `${result.failed} failed to sync` : undefined,
      });
      // Refresh time tracking data after sync
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["active-time-entry"] });
      queryClient.invalidateQueries({ queryKey: ["staff-locations"] });
    });

    return cleanup;
  }, [queryClient]);
}
