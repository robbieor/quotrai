/**
 * Cloudflare Email Worker — Revamo expense inbound
 *
 * Receives forwarded supplier invoices at expenses+@inbound.revamo.ai,
 * parses headers + body + attachments, signs the JSON with HMAC-SHA256, and
 * POSTs to the Revamo `process-expense-email` edge function.
 *
 * Required Worker secrets/vars:
 *   WEBHOOK_URL     — full URL of the process-expense-email edge function
 *   SHARED_SECRET   — same value as INBOUND_EMAIL_SHARED_SECRET in Lovable Cloud
 *
 * Bind this Worker as an Email Worker, then add a Routing Rule:
 *   matcher:  expenses+*@inbound.revamo.ai
 *   action:   Send to a Worker → this Worker
 */

import PostalMime from "postal-mime";

export default {
  async email(message, env, ctx) {
    try {
      // Read the raw RFC822 message stream
      const reader = message.raw.getReader();
      const chunks = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      const rawBytes = new Uint8Array(
        chunks.reduce((acc, c) => acc + c.length, 0)
      );
      let offset = 0;
      for (const c of chunks) { rawBytes.set(c, offset); offset += c.length; }

      // Parse MIME — extracts text/html bodies, headers, and attachments
      const parsed = await new PostalMime().parse(rawBytes);

      // Limit attachments to keep payload small (max 3, each ≤ 5 MB)
      const attachments = (parsed.attachments || [])
        .slice(0, 3)
        .filter(a => a.content && a.content.byteLength <= 5 * 1024 * 1024)
        .map(a => ({
          filename: a.filename || "attachment",
          mimeType: a.mimeType || "application/octet-stream",
          // base64 — Workers have btoa
          contentBase64: arrayBufferToBase64(a.content),
        }));

      const payload = {
        from: message.from,
        to: message.to,
        subject: parsed.subject || "",
        text: parsed.text || "",
        html: parsed.html || "",
        emailDate: parsed.date || null, // RFC 2822 date from supplier
        messageId: parsed.messageId || null,
        attachments,
      };

      const body = JSON.stringify(payload);
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = await hmacSha256Hex(env.SHARED_SECRET, `${timestamp}.${body}`);

      const res = await fetch(env.WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Revamo-Timestamp": timestamp,
          "X-Revamo-Signature": signature,
        },
        body,
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error(`Webhook returned ${res.status}: ${txt}`);
        // Reject so the sender gets a bounce and can retry
        message.setReject(`Revamo could not process this email (${res.status})`);
        return;
      }
    } catch (err) {
      console.error("Email Worker error:", err);
      message.setReject("Revamo expense pipeline error");
    }
  },
};

async function hmacSha256Hex(secret, data) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function arrayBufferToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
