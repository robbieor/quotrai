/**
 * Centralised email sender configuration.
 *
 * Brand is revamo.ai. notify.revamo.ai is the verified sending subdomain.
 *
 * Safe fallback: notify.foreman.ie remains verified and active. If revamo.ai
 * sending ever breaks, flip EMAIL_SENDER_DOMAIN back to "notify.foreman.ie"
 * and EMAIL_FROM_DOMAIN back to "foreman.ie", then redeploy email-sending
 * edge functions — no other changes required.
 */

export const EMAIL_FROM_DOMAIN = "revamo.ai";
export const EMAIL_SENDER_DOMAIN = "notify.revamo.ai";

/** Legacy fallback — kept verified so we can roll back instantly if needed. */
export const EMAIL_FALLBACK_FROM_DOMAIN = "foreman.ie";
export const EMAIL_FALLBACK_SENDER_DOMAIN = "notify.foreman.ie";

/** Inbound mail domain (Mailgun Routes) used for expense email forwarding. */
export const EXPENSE_INBOUND_DOMAIN = "inbound.revamo.ai";

/** Public-facing support address used in email footers / mailto links.
 *  Stays on foreman.ie until a support@revamo.ai mailbox is set up. */
export const SUPPORT_EMAIL = `support@${EMAIL_FALLBACK_FROM_DOMAIN}`;
