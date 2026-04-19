import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";

interface HighlightTarget {
  recordType: string;
  recordId: string;
  expiresAt: number;
}

interface HighlightContextType {
  highlights: HighlightTarget[];
  highlight: (recordType: string, recordId: string, durationMs?: number) => void;
  isHighlighted: (recordType: string, recordId: string) => boolean;
}

const HighlightContext = createContext<HighlightContextType | null>(null);

export function HighlightProvider({ children }: { children: ReactNode }) {
  const [highlights, setHighlights] = useState<HighlightTarget[]>([]);

  const highlight = useCallback((recordType: string, recordId: string, durationMs = 5000) => {
    const expiresAt = Date.now() + durationMs;
    setHighlights((prev) => {
      const filtered = prev.filter((h) => !(h.recordType === recordType && h.recordId === recordId));
      return [...filtered, { recordType, recordId, expiresAt }];
    });
  }, []);

  const isHighlighted = useCallback(
    (recordType: string, recordId: string) =>
      highlights.some((h) => h.recordType === recordType && h.recordId === recordId && h.expiresAt > Date.now()),
    [highlights]
  );

  // Listen for cross-context highlight events (from VoiceAgentContext client tools)
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ record_type: string; record_id: string; duration_ms?: number }>;
      const { record_type, record_id, duration_ms } = ce.detail || ({} as any);
      if (record_type && record_id) highlight(record_type, record_id, duration_ms ?? 5000);
    };
    window.addEventListener("george:highlight", handler as EventListener);
    return () => window.removeEventListener("george:highlight", handler as EventListener);
  }, [highlight]);

  // Sweep expired highlights every 1s
  useEffect(() => {
    const id = setInterval(() => {
      setHighlights((prev) => prev.filter((h) => h.expiresAt > Date.now()));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <HighlightContext.Provider value={{ highlights, highlight, isHighlighted }}>
      {children}
    </HighlightContext.Provider>
  );
}

export function useHighlight() {
  const ctx = useContext(HighlightContext);
  if (!ctx) throw new Error("useHighlight must be used within HighlightProvider");
  return ctx;
}
