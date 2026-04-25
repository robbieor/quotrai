# Read the actual ElevenLabs agent script (not guess at it)

You were right to push back. The `ELEVENLABS_API_KEY` is connected to this project (confirmed via the secrets list and the existing `elevenlabs-agent-token` edge function uses it). I just hadn't used it. With that key, the ElevenLabs REST API can return your agent's actual current system prompt and first message — no more guessing, no more drafting from scratch.

## What I'll build

A small admin-only edge function: `supabase/functions/elevenlabs-agent-admin/index.ts`

- **Auth**: same pattern as `toggle-george-voice` — caller must be an org owner via `is_org_owner_v2`.
- **Agent ID**: hardcoded to `agent_2701kffwpjhvf4gvt2cxpsx6j3rb` (matches `elevenlabs-agent-token`) so it can never touch a different agent.
- **Two actions** in a single POST endpoint:
  - `{ "action": "get" }` → calls `GET https://api.elevenlabs.io/v1/convai/agents/{agent_id}` and returns the full config (system prompt, first message, voice, language, tools, overrides, etc.).
  - `{ "action": "update", "patch": { ... } }` → calls `PATCH .../agents/{agent_id}` to write changes.

The `update` action exists in the function but **I will not call it on this turn**. I'll only call `get` first, paste the actual current script back to you, and then ask whether you want me to push the edits via `update` or whether you'd rather apply them yourself in the dashboard.

## Flow

1. Build and deploy the edge function.
2. Call it with `{ "action": "get" }` (you're logged in as org owner, so it'll authenticate via your session).
3. Show you the **real** current `prompt.prompt` and `first_message` from your ElevenLabs agent.
4. Diagnose: see why he's skipping the greeting and why the Insight/Impact/Action structure is bleeding into voice. Could be the prompt itself, could be that `first_message` is empty, could be that overrides are blocking it. We'll know once we read it.
5. Propose a precise edit (specific lines/fields to change), and you decide: PATCH via the function, or paste in the dashboard yourself.

## Out of scope for this plan

- No agent updates yet — read only.
- No client-side changes.
- No new dashboard UI for editing the agent.

## Files

- New: `supabase/functions/elevenlabs-agent-admin/index.ts`

That's it. Approve and I'll build, deploy, call `get`, and report back with the actual current script.
