/**
 * Centralised brand constants.
 * Import from here instead of hard-coding the app name anywhere.
 */

export const BRAND = {
  name: "revamo",
  fullName: "revamo AI",
  tagline: "The AI Operating System for Field Service",
  legalEntity: "Revamo Ltd",
  supportEmail: "support@revamo.ai",
  domain: "revamo.ai",
  /** Public-facing URLs */
  urls: {
    landing: "https://revamo.ai",
    privacy: "/privacy",
    terms: "/terms",
  },
} as const;
