/**
 * UTM parameter capture & persistence.
 *
 * On first landing, grabs utm_source, utm_medium, utm_campaign, utm_content, utm_term
 * from the URL and stores them in sessionStorage so they survive navigation.
 *
 * Call `getUtmParams()` at signup time to attach attribution to the user record.
 */

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
const STORAGE_KEY = "quotr_utm";

export type UtmParams = Partial<Record<(typeof UTM_KEYS)[number], string>>;

/** Call once on app mount (e.g. in App.tsx or main.tsx) */
export function captureUtmParams(): void {
  try {
    const params = new URLSearchParams(window.location.search);
    const utm: UtmParams = {};
    let hasAny = false;

    for (const key of UTM_KEYS) {
      const val = params.get(key);
      if (val) {
        utm[key] = val;
        hasAny = true;
      }
    }

    // Only overwrite if new UTMs are present (don't clear existing)
    if (hasAny) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(utm));
    }
  } catch {
    // Private browsing / SSR – ignore
  }
}

/** Retrieve stored UTM params (returns {} if none) */
export function getUtmParams(): UtmParams {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UtmParams) : {};
  } catch {
    return {};
  }
}
