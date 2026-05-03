/**
 * Centralised email sender configuration.
 *
 * Brand has moved to revamo.ai, but email sending stays on foreman.ie until
 * SPF/DKIM/DMARC for revamo.ai are verified. When that's done, flip the two
 * constants below and redeploy email-sending edge functions — no other
 * changes required.
 */

export const EMAIL_FROM_DOMAIN = "foreman.ie";
export const EMAIL_SENDER_DOMAIN = "notify.foreman.ie";

/** Public-facing support address used in email footers / mailto links. */
export const SUPPORT_EMAIL = `support@${EMAIL_FROM_DOMAIN}`;
