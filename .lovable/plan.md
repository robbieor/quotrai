

## Remove Fake Social Proof & Data Points

The social proof bar from your screenshot ("500+ tradespeople", "4.9 average rating", "12 trades supported") doesn't exist in the current code — it was likely already removed in a previous update. However, the **published site** may still show the old version because frontend changes require clicking "Update" in the publish dialog.

There are still a few remaining fake data points in the codebase that should be cleaned up:

### Changes

1. **`src/pages/Signup.tsx`** — Remove the fabricated testimonial quote ("Quotr paid for itself in the first week…" attributed to "Electrician, Manchester") and change "Join hundreds of tradespeople" to something honest like "Start running your business with Quotr."

2. **`src/pages/TradeLanding.tsx`** — Change "Join hundreds of {trade}..." (line 190) to an honest alternative like "Ready to streamline your business?"

3. **`src/components/landing/AnimatedCounter.tsx`** — Delete this file entirely. It's unused anywhere in the codebase and was likely built for the old fake stats bar.

4. **Republish** — After changes, click **Update** in the publish dialog so the live site at quotrai.lovable.app reflects the current code (removing any old social proof bar still visible there).

