-- Add assigned_to column to jobs table
ALTER TABLE public.jobs ADD COLUMN assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add index for filtering jobs by assigned user
CREATE INDEX idx_jobs_assigned_to ON public.jobs(assigned_to);