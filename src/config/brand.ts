/**
 * Centralised brand constants.
 * Import from here instead of hard-coding the app name anywhere.
 */

export const BRAND = {
  name: "Revamo",
  fullName: "Revamo AI",
  tagline: "The AI Operating System for Field Service",
  legalEntity: "Revamo Ltd",
  supportEmail: "support@foreman.ie",
  domain: "foreman.ie",
  /** Public-facing URLs */
  urls: {
    landing: "https://revamo.ai",
    privacy: "/privacy",
    terms: "/terms",
  },
} as const;
