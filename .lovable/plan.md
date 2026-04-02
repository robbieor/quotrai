

# Wire `ai_conversations` Table into George Chat System

## What This Does

The new `ai_conversations` table acts as a **flat analytics/logging layer** alongside the existing `george_conversations` + `george_messages` tables. It captures every message exchange with token usage and metadata — useful for usage tracking, billing, and AI performance analysis.

## Approach

After each AI exchange in the `george-chat` edge function, insert both the user message and assistant response into `ai_conversations` using the service client. This is fire-and-forget (non-blocking) so it doesn't slow down chat responses.

### Data captured per row:
- `user_id` — authenticated user
- `role` — "user" or "assistant"
- `content` — the message text
- `tokens_used` — from the AI model response (when available)
- `metadata` — conversation_id, intent, model used, team_id, tool calls made

## Changes

### 1. Create the table (migration — already proposed, needs execution)

```sql
create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
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
```

### 2. Edit `supabase/functions/george-chat/index.ts`

Add a helper function `logToAiConversations` that inserts user + assistant rows:

```typescript
async function logToAiConversations(
  supabase: any,
  userId: string,
  userMessage: string,
  assistantMessage: string,
  metadata: Record<string, any>,
  tokensUsed?: number
) {
  await supabase.from("ai_conversations").insert([
    { user_id: userId, role: "user", content: userMessage, metadata },
    { user_id: userId, role: "assistant", content: assistantMessage, metadata, tokens_used: tokensUsed },
  ]);
}
```

Call this function at every response exit point:
- After direct webhook responses (~line 437)
- After quick action short-circuits (~line 467)
- After streaming completion (~end of SSE loop)
- After JSON fallback responses
- After tool-call round-trip responses

Metadata will include: `{ conversation_id, team_id, intent, model, tool_calls }`.

Token usage will be extracted from the Lovable AI response when available (from `usage.total_tokens` in the response).

## Files

| Action | File |
|--------|------|
| Migration | Create `ai_conversations` table with RLS |
| Edit | `supabase/functions/george-chat/index.ts` — add logging at all response exit points |

No frontend changes needed — the existing chat UI continues using `george_conversations` / `george_messages`. This table is for analytics and usage tracking.

