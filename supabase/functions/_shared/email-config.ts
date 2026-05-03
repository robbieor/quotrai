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

/** Inbound mail domain (Mailgun Routes) used for expense email forwarding.
 *  Outbound sending stays on notify.foreman.ie until revamo.ai is verified. */
export const EXPENSE_INBOUND_DOMAIN = "inbound.revamo.ai";

/** Public-facing support address used in email footers / mailto links. */
export const SUPPORT_EMAIL = `support@${EMAIL_FROM_DOMAIN}`;
