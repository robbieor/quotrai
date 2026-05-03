## Why this keeps happening

You say "it connects then drops immediately." That pattern almost always comes from one of three sources, and right now we can't see which because:

- The edge function logs for `elevenlabs-agent-token` and `george-webhook` show no recent traffic (so either the call isn't reaching the backend, or logs aren't being flushed).
- The disconnect toast text on the published site isn't being captured anywhere we can read after the fact.
- Every time you hit "Call" we mint a fresh ElevenLabs token (which counts as usage) before we even know if the agent is reachable.

So step 1 is **stop bleeding credits while diagnosing**, step 2 is **find the actual reason**, step 3 is **fix it**.

## The 3 likely root causes (in order of probability)

1. **ElevenLabs API key missing the `convai_write` / "ElevenAgents: Write" scope** — your own memory note flags this exact constraint. A key without it gets a token, connects briefly, then ElevenLabs closes the WebSocket with a permissions error.
2. **Agent ID `agent_2701kffwpjhvf4gvt2cxpsx6j3rb` no longer exists** in your ElevenLabs workspace, or was rotated. Same symptom: token issues OK, WS connects, then closes with `agent_not_found` / 1008.
3. **Insufficient ElevenLabs credits / billing block** on the ElevenLabs side. Token endpoint succeeds, WS closes immediately with a "payment issue" message — your `onDisconnect` already extracts `d.message` for this.

## Plan

### Phase 1 — Pre-flight check (no credits spent)

Add a one-shot **diagnostics endpoint** `voice-preflight` that runs server-side only and returns:
- Is `ELEVENLABS_API_KEY` set
- `GET /v1/user` → confirms key is valid + returns subscription tier + remaining character quota
- `GET /v1/convai/agents/{agentId}` → confirms the hardcoded agent still exists and key has access
- `GET /v1/user/subscription` → flags if conversational AI minutes are exhausted

Surface this in **Settings → Voice → Diagnostics** with a "Run check" button. Until all three pass, the main "Call" button shows the specific failure ("ElevenLabs key missing convai_write scope" / "Agent not found" / "ElevenLabs credits exhausted") instead of letting you tap and burn a token.

### Phase 2 — Capture the real disconnect reason

Persist the last 10 voice attempts (timestamp, phase reached, disconnect `reason` / `closeCode` / `message`) into a `voice_session_logs` table written from `onDisconnect`. Then in Settings → Voice we can see exactly what the SDK reported on each failed call. This is the only way to stop guessing.

### Phase 3 — Fix based on what diagnostics reports

Most likely fixes (we'll do whichever applies, not all):
- **Scope problem** → I'll prompt you to rotate the key with `convai_write` enabled and re-add it.
- **Agent ID drift** → move agent ID from hardcoded constant to a project secret `ELEVENLABS_AGENT_ID`, default to current value, and document where to update it.
- **Billing/credits** → show a clear "ElevenLabs account out of minutes" banner instead of a generic "Disconnected" toast.

### Phase 4 — Stop the credit bleed regardless

- Disable the "Call" button until preflight has passed at least once per session (cached for 5 min).
- Skip minting a token if preflight failed in the last 60 s.
- The voice top-up / usage counter only increments after `onConnect` fires (not on token mint).

## What I need from you

Reply **"go"** and I'll switch to build mode and ship Phase 1 + Phase 2 first (pure diagnostics, zero behavioural risk). Once we see what the preflight + session log says, Phase 3 is a 5-minute targeted fix.

If you'd rather skip diagnostics and just want me to **rotate the ElevenLabs key with full scopes right now**, say "rotate key" and I'll request the new secret immediately — that fixes ~70% of cases like this.