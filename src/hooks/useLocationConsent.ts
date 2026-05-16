// useLocationConsent: lightweight wrapper around localStorage + profile flag.
// Guards GPS calls so we always show purpose-of-use before the OS prompt.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "revamo_location_consent_v1";

export function useLocationConsent() {
  const [consented, setConsented] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch { return false; }
  });
  const [promptOpen, setPromptOpen] = useState(false);
  const [pendingResolve, setPendingResolve] = useState<((v: boolean) => void) | null>(null);

  // Hydrate from profile so consent is shared across devices.
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("location_consent_at")
        .eq("id", user.id)
        .maybeSingle();
      if (data?.location_consent_at) {
        try { localStorage.setItem(STORAGE_KEY, "true"); } catch {}
        setConsented(true);
      }
    })();
  }, []);

  const grant = useCallback(async () => {
    try { localStorage.setItem(STORAGE_KEY, "true"); } catch {}
    setConsented(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({ location_consent_at: new Date().toISOString() })
          .eq("id", user.id);
      }
    } catch {}
    if (pendingResolve) { pendingResolve(true); setPendingResolve(null); }
    setPromptOpen(false);
  }, [pendingResolve]);

  const decline = useCallback(() => {
    if (pendingResolve) { pendingResolve(false); setPendingResolve(null); }
    setPromptOpen(false);
  }, [pendingResolve]);

  const revoke = useCallback(async () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    setConsented(false);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({ location_consent_at: null })
        .eq("id", user.id);
    }
  }, []);

  // ensureConsent: returns true if granted (now or previously), false if declined.
  const ensureConsent = useCallback((): Promise<boolean> => {
    if (consented) return Promise.resolve(true);
    return new Promise<boolean>((resolve) => {
      setPendingResolve(() => resolve);
      setPromptOpen(true);
    });
  }, [consented]);

  return { consented, promptOpen, ensureConsent, grant, decline, revoke };
}
