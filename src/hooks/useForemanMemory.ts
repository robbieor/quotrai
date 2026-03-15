import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import type { MemoryContext, ForemanPreferences } from "@/types/foreman-actions";
import { DEFAULT_FOREMAN_PREFERENCES } from "@/types/foreman-actions";

export interface SessionEntity {
  key: string;
  value: string;
  label: string;
  timestamp: string;
}

export interface ForemanMemoryState {
  // Current task context
  taskContext: MemoryContext;
  // Recent session entities (last ~10 used)
  sessionEntities: SessionEntity[];
  // User preferences (persisted)
  preferences: ForemanPreferences;
  preferencesLoaded: boolean;
}

export type ClearMode = "all" | "keep_customer" | "keep_preferences";

export function useForemanMemory() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [taskContext, setTaskContext] = useState<MemoryContext>({});
  const [sessionEntities, setSessionEntities] = useState<SessionEntity[]>([]);
  const [preferences, setPreferences] = useState<ForemanPreferences>(DEFAULT_FOREMAN_PREFERENCES);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);

  // Load preferences from DB on mount
  useEffect(() => {
    if (!user || !profile?.team_id) return;

    async function loadPreferences() {
      const { data } = await supabase
        .from("foreman_ai_preferences")
        .select("*")
        .eq("user_id", user!.id)
        .eq("team_id", profile!.team_id!)
        .maybeSingle();

      if (data) {
        setPreferences({
          always_create_drafts: data.always_create_drafts,
          default_payment_terms_days: data.default_payment_terms_days,
          itemised_format: data.itemised_format,
          require_confirmation_before_send: data.require_confirmation_before_send,
          default_tax_rate: data.default_tax_rate ?? undefined,
          labour_materials_split: data.labour_materials_split,
        });
      }
      setPreferencesLoaded(true);
    }
    loadPreferences();
  }, [user, profile?.team_id]);

  // Update task context from an action plan response
  const updateFromActionPlan = useCallback((planMemory: MemoryContext | undefined) => {
    if (!planMemory) return;
    setTaskContext(prev => ({ ...prev, ...planMemory }));

    // Track session entities from the plan
    const now = new Date().toISOString();
    const newEntities: SessionEntity[] = [];
    if (planMemory.current_customer) {
      newEntities.push({ key: "customer", value: planMemory.current_customer.name, label: "Customer", timestamp: now });
    }
    if (planMemory.current_job) {
      newEntities.push({ key: "job", value: planMemory.current_job.title, label: "Job", timestamp: now });
    }
    if (planMemory.current_quote) {
      newEntities.push({ key: "quote", value: planMemory.current_quote.number, label: "Quote", timestamp: now });
    }
    if (planMemory.current_invoice) {
      newEntities.push({ key: "invoice", value: planMemory.current_invoice.number, label: "Invoice", timestamp: now });
    }

    if (newEntities.length > 0) {
      setSessionEntities(prev => {
        const updated = [...prev];
        for (const entity of newEntities) {
          const existingIdx = updated.findIndex(e => e.key === entity.key && e.value === entity.value);
          if (existingIdx >= 0) {
            updated[existingIdx] = entity; // refresh timestamp
          } else {
            updated.push(entity);
          }
        }
        return updated.slice(-10); // keep last 10
      });
    }
  }, []);

  // Build the full memory payload for the edge function
  const buildMemoryPayload = useCallback(() => {
    return {
      ...taskContext,
      session_entities: sessionEntities.length > 0 ? sessionEntities : undefined,
      unresolved_fields: taskContext.unresolved_fields,
    };
  }, [taskContext, sessionEntities]);

  // Clear context
  const clearContext = useCallback((mode: ClearMode = "all") => {
    if (mode === "all") {
      setTaskContext({});
      setSessionEntities([]);
    } else if (mode === "keep_customer") {
      setTaskContext(prev => ({
        current_customer: prev.current_customer,
      }));
    } else if (mode === "keep_preferences") {
      setTaskContext({});
      setSessionEntities([]);
    }
  }, []);

  // Save preferences to DB
  const savePreferences = useCallback(async (newPrefs: ForemanPreferences) => {
    if (!user || !profile?.team_id) return;
    setPreferences(newPrefs);

    const { error } = await supabase
      .from("foreman_ai_preferences")
      .upsert({
        user_id: user.id,
        team_id: profile.team_id,
        always_create_drafts: newPrefs.always_create_drafts,
        default_payment_terms_days: newPrefs.default_payment_terms_days,
        itemised_format: newPrefs.itemised_format,
        require_confirmation_before_send: newPrefs.require_confirmation_before_send,
        default_tax_rate: newPrefs.default_tax_rate ?? null,
        labour_materials_split: newPrefs.labour_materials_split,
        updated_at: new Date().toISOString(),
      }, { onConflict: "team_id,user_id" });

    if (error) {
      console.error("Failed to save AI preferences:", error);
      throw error;
    }
  }, [user, profile?.team_id]);

  const hasActiveContext = !!(
    taskContext.current_customer ||
    taskContext.current_job ||
    taskContext.current_quote ||
    taskContext.current_invoice
  );

  return {
    taskContext,
    sessionEntities,
    preferences,
    preferencesLoaded,
    hasActiveContext,
    updateFromActionPlan,
    buildMemoryPayload,
    clearContext,
    savePreferences,
    setTaskContext,
  };
}
