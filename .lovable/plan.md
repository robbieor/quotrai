

## Create ElevenLabs Agent Tool Sync Script

### Problem
Tool definitions for the Foreman voice agent (agent_2701kffwpjhvf4gvt2cxpsx6j3rb) must currently be updated manually via the ElevenLabs dashboard. There's no sync script in the codebase despite one being referenced in memory.

### Solution
Create a sync edge function that pushes all client tool definitions to the ElevenLabs agent via `PATCH /v1/convai/agents/{agent_id}`. Can be triggered on-demand.

### Steps

**Step 1: Create tool definitions file**
- `supabase/functions/_shared/foreman-tool-definitions.ts` — single source of truth for all 59 tool schemas (name, description, parameters, type: "client")
- Extract from current `george-webhook/index.ts` handler logic to ensure parity

**Step 2: Create sync edge function**
- `supabase/functions/sync-agent-tools/index.ts`
- Reads tool definitions, calls `PATCH https://api.elevenlabs.io/v1/convai/agents/{agent_id}` with `conversation_config.tools` payload
- Uses existing `ELEVENLABS_API_KEY` secret (needs Write scope)
- Returns success/diff summary

**Step 3: Add convenience script**
- A simple curl command or frontend button in Settings → Foreman AI to trigger the sync

### Files

| File | Action |
|------|--------|
| `supabase/functions/_shared/foreman-tool-definitions.ts` | New — all tool schemas |
| `supabase/functions/sync-agent-tools/index.ts` | New — PATCH endpoint |
| `src/components/settings/ForemanAISettings.tsx` | Add "Sync Tools" button for admin use |

### Prerequisites
- `ELEVENLABS_API_KEY` must have `ElevenAgents: Write` scope (per memory note, this is already configured)

