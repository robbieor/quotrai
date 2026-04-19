import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { TeamRole } from "@/hooks/useUserRole";

const STORAGE_KEY = "foreman:role-preview";

interface RolePreviewContextValue {
  /** Role currently being previewed (overrides real role). null = no preview, showing real role. */
  previewRole: TeamRole | null;
  /** Set or clear the preview role. */
  setPreviewRole: (role: TeamRole | null) => void;
  /** True when actively previewing as a different role. */
  isPreviewing: boolean;
}

const RolePreviewContext = createContext<RolePreviewContextValue | undefined>(undefined);

export function RolePreviewProvider({ children }: { children: ReactNode }) {
  const [previewRole, setPreviewRoleState] = useState<TeamRole | null>(() => {
    if (typeof window === "undefined") return null;
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved === "owner" || saved === "manager" || saved === "member" || saved === "ceo") {
      return saved;
    }
    return null;
  });

  const setPreviewRole = (role: TeamRole | null) => {
    setPreviewRoleState(role);
    if (role) {
      sessionStorage.setItem(STORAGE_KEY, role);
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  };

  // Keep tabs in sync if user opens preview in multiple tabs
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        const v = e.newValue;
        setPreviewRoleState(
          v === "owner" || v === "manager" || v === "member" || v === "ceo" ? v : null
        );
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  return (
    <RolePreviewContext.Provider
      value={{ previewRole, setPreviewRole, isPreviewing: previewRole !== null }}
    >
      {children}
    </RolePreviewContext.Provider>
  );
}

export function useRolePreview() {
  const ctx = useContext(RolePreviewContext);
  if (!ctx) throw new Error("useRolePreview must be used within RolePreviewProvider");
  return ctx;
}
