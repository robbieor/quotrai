
CREATE TABLE public.drip_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  drip_step INT NOT NULL,
  email TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, drip_step)
);

CREATE INDEX idx_drip_sequences_user ON public.drip_sequences(user_id);

ALTER TABLE public.drip_sequences ENABLE ROW LEVEL SECURITY;
