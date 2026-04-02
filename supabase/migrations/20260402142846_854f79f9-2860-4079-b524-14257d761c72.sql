
ALTER TABLE public.referrals ADD COLUMN referral_code TEXT;
CREATE UNIQUE INDEX idx_referrals_code ON public.referrals(referral_code) WHERE referral_code IS NOT NULL;
