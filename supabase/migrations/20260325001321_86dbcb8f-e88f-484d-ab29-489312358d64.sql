
-- Add columns to agent_tasks
ALTER TABLE public.agent_tasks 
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'preview',
  ADD COLUMN IF NOT EXISTS input_payload jsonb,
  ADD COLUMN IF NOT EXISTS result_payload jsonb,
  ADD COLUMN IF NOT EXISTS error_message text;

-- Create task_steps table
CREATE TABLE public.task_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.agent_tasks(id) ON DELETE CASCADE NOT NULL,
  step_key text NOT NULL,
  label text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  sort_order int NOT NULL DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz
);

-- RLS on task_steps: users can see/manage steps for their own tasks
ALTER TABLE public.task_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own task steps" ON public.task_steps
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agent_tasks 
      WHERE agent_tasks.id = task_steps.task_id 
      AND agent_tasks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users manage own task steps" ON public.task_steps
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agent_tasks 
      WHERE agent_tasks.id = task_steps.task_id 
      AND agent_tasks.user_id = auth.uid()
    )
  );

-- Service role policy for edge functions
CREATE POLICY "Service role full access task_steps" ON public.task_steps
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Enable realtime for task_steps
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_steps;

-- Auto-expire stale tasks: trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_agent_task_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agent_tasks_updated_at
  BEFORE UPDATE ON public.agent_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_agent_task_timestamp();
