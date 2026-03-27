/**
 * Centralised brand constants.
 * Import from here instead of hard-coding the app name anywhere.
 */

export const BRAND = {
  name: "Foreman",
  fullName: "Foreman AI",
  tagline: "The AI Operating System for Field Service",
  legalEntity: "Foreman Ltd",
  supportEmail: "support@foreman.ie",
  domain: "foreman.ie",
  /** Public-facing URLs */
  urls: {
    landing: "https://foreman.world",
    privacy: "/privacy",
    terms: "/terms",
  },
} as const;
