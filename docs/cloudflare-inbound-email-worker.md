# Cloudflare Inbound Email Worker — Setup Guide

This sets up free, unlimited inbound email for `expenses+<code>@inbound.revamo.ai`
that forwards every message to our `process-expense-email` edge function with
HMAC-signed payloads.

## 1. Add `inbound.revamo.ai` to Cloudflare

In the Cloudflare dashboard for `revamo.ai`:

1. Go to **Email → Email Routing**.
2. Enable Email Routing for the zone if not already on.
3. Cloudflare will auto-add the required MX records on `revamo.ai`.
4. We want a subdomain (`inbound.revamo.ai`), so under **Routes → Custom addresses**
   we'll match on the full address. Cloudflare Email Routing does not natively
   handle subdomains — instead, add these MX records manually for
   `inbound.revamo.ai`:

   ```
   inbound.revamo.ai  MX  10  route1.mx.cloudflare.net.
   inbound.revamo.ai  MX  20  route2.mx.cloudflare.net.
   inbound.revamo.ai  MX  30  route3.mx.cloudflare.net.
   ```

   And the SPF record:
   ```
   inbound.revamo.ai  TXT  "v=spf1 include:_spf.mx.cloudflare.net ~all"
   ```

## 2. Create the Email Worker

1. Cloudflare dashboard → **Workers & Pages → Create → Create Worker**.
2. Name it `revamo-inbound-expenses`.
3. Replace the default code with the script in
   `cloudflare/inbound-expenses-worker.js` (next to this file).
4. **Settings → Variables and Secrets** add:
   - `WEBHOOK_URL` =
     `https://leojhjynyxhpfyrbcabf.functions.supabase.co/process-expense-email`
   - `SHARED_SECRET` = (same value as `INBOUND_EMAIL_SHARED_SECRET` we'll add to
     Lovable Cloud — generate a long random string, e.g. `openssl rand -hex 32`)
5. **Deploy**.

## 3. Bind the Worker as an Email destination

1. **Email → Email Routing → Email Workers** tab.
2. Click **Create** → choose the `revamo-inbound-expenses` worker.
3. Then **Routing rules → Create rule**:
   - **Matcher:** "Custom address" → `expenses+*@inbound.revamo.ai`
     (Cloudflare supports wildcard matching with `*`)
   - **Action:** "Send to a Worker" → `revamo-inbound-expenses`
4. Save and enable the rule.

## 4. Add the shared secret to Lovable Cloud

Add `INBOUND_EMAIL_SHARED_SECRET` as a backend secret with the **exact same value**
you pasted into the Worker.

## How it works

1. Customer forwards a supplier invoice to `expenses+abc123@inbound.revamo.ai`.
2. Cloudflare receives the email, runs the Worker.
3. Worker parses headers + body + (later) attachments into JSON.
4. Worker computes `HMAC-SHA256(timestamp + "." + body)` with the shared secret.
5. POSTs to our edge function with `X-Revamo-Timestamp` and `X-Revamo-Signature` headers.
6. Edge function verifies the signature, parses with Gemini, inserts the expense.

Cost: **€0**. No card required. Cloudflare Email Workers are free with no
per-email cost on the standard Workers free tier (100k requests/day).
