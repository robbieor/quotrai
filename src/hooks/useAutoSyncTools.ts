import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Bump alongside TOOLS_VERSION in supabase/functions/_shared/foreman-tool-definitions.ts
 * so a new deploy re-pushes tools + agent context to ElevenLabs on next page load
 * for every user — silently, no UI involvement.
 */
const TOOLS_VERSION = "2025-04-18.1";
const STORAGE_KEY = "__foreman_tools_synced_version__";

export function useAutoSyncTools() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    if (localStorage.getItem(STORAGE_KEY) === TOOLS_VERSION) return;

    // Optimistically mark — sync runs in background, version bump means next visit retries
    localStorage.setItem(STORAGE_KEY, TOOLS_VERSION);

    supabase.functions.invoke("sync-agent-tools").catch(() => {
      // Silent failure — clear flag so a future visit retries
      localStorage.removeItem(STORAGE_KEY);
    });
  }, [user]);
}
