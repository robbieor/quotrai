create table public.ai_user_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  category text not null,
  key text not null,
  value text not null,
  confidence float default 1.0,
  source text,
  last_referenced_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, category, key)
);

create index idx_ai_user_memory_user on public.ai_user_memory(user_id, category);

alter table public.ai_user_memory enable row level security;

create policy "Users can read own memory"
  on public.ai_user_memory for select to authenticated
  using (user_id = auth.uid());

create policy "Users can insert own memory"
  on public.ai_user_memory for insert to authenticated
  with check (user_id = auth.uid());

create policy "Users can update own memory"
  on public.ai_user_memory for update to authenticated
  using (user_id = auth.uid());