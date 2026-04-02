create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  metadata jsonb default '{}',
  tokens_used int,
  created_at timestamptz default now()
);

create index idx_ai_conversations_user on public.ai_conversations(user_id, created_at desc);

alter table public.ai_conversations enable row level security;

create policy "Users can read own conversations"
  on public.ai_conversations for select to authenticated
  using (user_id = auth.uid());

create policy "Users can insert own conversations"
  on public.ai_conversations for insert to authenticated
  with check (user_id = auth.uid());