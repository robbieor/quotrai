

# Wire George System Prompt + ai_user_memory into Foreman AI

## What Changes

**1. Replace the system prompt** with the new George persona — business partner, not generic assistant. The new prompt reframes George as the user's dedicated operations co-pilot who references real data, remembers everything, and proactively surfaces insights.

**2. Load persistent memories** from `ai_user_memory` before each AI call — inject them into the system prompt as `{context}` so George knows the user's preferences, business facts, goals, and pain points.

**3. Extract and store new memories** after each AI response — use a lightweight secondary AI call to identify any new facts/preferences/patterns revealed in the conversation, then upsert them into `ai_user_memory`.

## Technical Details

### System prompt replacement (~line 756-793)

Replace the existing `systemPrompt` block with the new George persona. Keep all existing dynamic injections (trade context, region, date, preferences, memory context) but restructure them into the `{context}` section of the new prompt. The new prompt includes:
- George identity and tone rules
- Capability list (answer questions, remember, proactively surface, help decide, draft/create, learn/adapt, schedule, trade knowledge)
- Memory extraction instructions (returned as metadata)
- Rules (no hallucination, reference real data, use tools, be concise)

### Load memories (~line 378, parallel with profile/prefs fetch)

Add `ai_user_memory` query to the existing `Promise.all` block:
```typescript
serviceSupabase.from("ai_user_memory")
  .select("category, key, value, confidence, source")
  .eq("user_id", userId)
  .order("last_referenced_at", { ascending: false, nullsFirst: false })
  .limit(30)
```

Inject loaded memories into the system prompt context section, grouped by category.

### Extract memories after response (~after line 1092)

After getting the final AI response, make a fire-and-forget secondary AI call using `gemini-2.5-flash-lite` with tool calling to extract structured memory updates:
- Tool: `update_user_memory` with parameters `{ memories: [{ category, key, value, confidence, source }] }`
- Upsert extracted memories into `ai_user_memory` using `ON CONFLICT (user_id, category, key)` via the service client
- This is non-blocking — doesn't slow down the response

### Update `last_referenced_at` on used memories

When memories are loaded and injected, update their `last_referenced_at` timestamp so frequently-used memories stay at the top.

## Files

| Action | File |
|--------|------|
| Edit | `supabase/functions/george-chat/index.ts` — new system prompt, load memories, extract memories |

No database changes. No frontend changes. The `ai_user_memory` table already exists.

