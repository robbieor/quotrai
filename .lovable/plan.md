## Problem

Voice call disconnects immediately with `closeCode: 1008` and `"Override for field 'first_message' is not allowed by config."`.

ElevenLabs rejects the connection because `src/contexts/VoiceAgentContext.tsx` passes `overrides.agent.firstMessage`, but the agent's dashboard config does not list `first_message` as an allowed override.

## Fix

In `src/contexts/VoiceAgentContext.tsx` (around lines 537–549), remove the `overrides.agent.firstMessage` block (and the associated `greetingName` / `firstMessage` locals). The agent's own first message configured in ElevenLabs will play instead.

No other files need to change. To restore a personalized greeting later, either:
- Enable the `first_message` override in the ElevenLabs agent dashboard, then re-add the block, or
- Use `dynamicVariables` (e.g., `{{user_first_name}}`) referenced inside the agent's configured first message — this does not require the override permission.

## Files touched

- `src/contexts/VoiceAgentContext.tsx` — drop the `firstMessage` override so WebRTC/WebSocket sessions are accepted.
