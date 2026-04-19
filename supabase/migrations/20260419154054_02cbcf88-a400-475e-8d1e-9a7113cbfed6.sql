-- Add unique partial index on subscriptions_v2.stripe_subscription_id for fast webhook lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_v2_stripe_subscription_id
  ON public.subscriptions_v2(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;