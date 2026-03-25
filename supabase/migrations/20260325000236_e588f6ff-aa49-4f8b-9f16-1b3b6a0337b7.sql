
create table public.agent_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  team_id uuid,
  task_type text not null,
  steps jsonb not null default '[]',
  status text not null default 'running',
  current_step_index int default 0,
  completed_steps text[] default '{}',
  failed_step jsonb,
  success_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.agent_tasks enable row level security;

create policy "Users see own tasks" on public.agent_tasks
  for select to authenticated using (user_id = auth.uid());

create policy "Users insert own tasks" on public.agent_tasks
  for insert to authenticated with check (user_id = auth.uid());

create policy "Users update own tasks" on public.agent_tasks
  for update to authenticated using (user_id = auth.uid());

create policy "Users delete own tasks" on public.agent_tasks
  for delete to authenticated using (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_tasks;
