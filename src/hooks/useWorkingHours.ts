import { useState, useCallback } from "react";

const STORAGE_KEY = "foreman-working-hours";
const DEFAULT_START = 6;
const DEFAULT_END = 20;

interface WorkingHours {
  startHour: number;
  endHour: number;
}

function load(): WorkingHours {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.startHour >= 0 && parsed.endHour <= 23 && parsed.startHour < parsed.endHour) {
        return parsed;
      }
    }
  } catch {}
  return { startHour: DEFAULT_START, endHour: DEFAULT_END };
}

export function useWorkingHours() {
  const [hours, setHours] = useState<WorkingHours>(load);

  const updateHours = useCallback((startHour: number, endHour: number) => {
    const next = { startHour, endHour };
    setHours(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const hourSlots = Array.from(
    { length: hours.endHour - hours.startHour + 1 },
    (_, i) => i + hours.startHour
  );

  return { startHour: hours.startHour, endHour: hours.endHour, hourSlots, updateHours };
}
