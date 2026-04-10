import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const SESSION_KEY = "__foreman_tools_synced__";

export function useAutoSyncTools() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    sessionStorage.setItem(SESSION_KEY, "1");

    supabase.functions.invoke("sync-agent-tools").catch(() => {
      // Silent failure — tools will sync next session
    });
  }, [user]);
}
