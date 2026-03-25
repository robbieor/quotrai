
-- FIX 1: Create safe view for team member profiles (hides sensitive fields)
CREATE OR REPLACE VIEW public.team_member_profiles
WITH (security_invoker = true)
AS
  SELECT 
    p.id,
    p.team_id,
    p.full_name,
    p.avatar_url,
    p.trade_type,
    p.bio,
    p.email
  FROM public.profiles p
  WHERE p.team_id = get_user_team_id();

-- FIX 2: Create safe view for teams (hides Stripe/financial fields from non-owners)
CREATE OR REPLACE VIEW public.team_public
WITH (security_invoker = true)
AS
  SELECT
    t.id,
    t.name,
    t.created_at,
    t.subscription_tier,
    t.subscription_plan,
    t.george_voice_minutes_limit,
    t.george_voice_minutes_used,
    t.george_usage_reset_date,
    t.trial_ends_at,
    t.is_trial,
    t.george_voice_seats,
    t.george_voice_rollover_minutes,
    t.is_demo,
    CASE WHEN is_owner_of_team(t.id) THEN t.stripe_connect_account_id ELSE NULL END AS stripe_connect_account_id,
    CASE WHEN is_owner_of_team(t.id) THEN t.stripe_connect_onboarding_complete ELSE false END AS stripe_connect_onboarding_complete,
    CASE WHEN is_owner_of_team(t.id) THEN t.platform_fee_percent ELSE NULL END AS platform_fee_percent,
    CASE WHEN is_owner_of_team(t.id) THEN t.voice_overage_rate ELSE NULL END AS voice_overage_rate,
    CASE WHEN is_owner_of_team(t.id) THEN t.voice_overage_enabled ELSE false END AS voice_overage_enabled,
    CASE WHEN is_owner_of_team(t.id) THEN t.george_voice_price_per_seat ELSE NULL END AS george_voice_price_per_seat
  FROM public.teams t;
