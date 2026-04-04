UPDATE public.teams SET platform_fee_percent = 1.5 WHERE platform_fee_percent = 2.5 OR platform_fee_percent IS NULL;
ALTER TABLE public.teams ALTER COLUMN platform_fee_percent SET DEFAULT 1.5;