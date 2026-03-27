/**
 * Centralised brand constants.
 * Import from here instead of hard-coding the app name anywhere.
 */

export const BRAND = {
  name: "Foreman",
  fullName: "Foreman AI",
  tagline: "Job Management & AI for Trade Businesses",
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
