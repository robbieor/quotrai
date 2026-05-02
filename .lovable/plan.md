## Why George doesn't greet you

When you tap "Call Foreman AI", the connection succeeds (`✅ onConnect fired` in your logs). But ElevenLabs only speaks first if the agent has a **First message** configured. Our `sync-agent-tools` function pushes the system prompt + tools to the agent, but it never sets `first_message` — so the agent waits silently for you to speak.

The agent prompt in `AGENT_APP_CONTEXT` describes George's personality but contains no opening line, and nothing in the codebase tells ElevenLabs to greet the user.

## Plan

### 1. Add a first_message to the synced agent config

In `supabase/functions/_shared/foreman-tool-definitions.ts`:
- Add `export const AGENT_FIRST_MESSAGE = "Howya {{user_name}}, George here. What can I sort for ya?"` (using ElevenLabs dynamic variable syntax — `user_name` is already passed in `dynamicVariables`).
- Bump `TOOLS_VERSION` to `2025-04-19.2` so every client re-syncs on next page load.

In `supabase/functions/sync-agent-tools/index.ts`:
- Import `AGENT_FIRST_MESSAGE`.
- Include it in the PATCH body under `conversation_config.agent.first_message` so it persists on the agent.

### 2. Also send it as a per-session override (belt + braces)

In `src/contexts/VoiceAgentContext.tsx` inside `startAndWaitForConnect` (the `VoiceConversation.startSession({...})` call ~line 537), add:

```ts
overrides: {
  agent: {
    firstMessage: contextRef.current.userName
      ? `Howya ${contextRef.current.userName}, George here. What can I sort for ya?`
      : "Howya, George here. What can I sort for ya?",
  },
},
```

This guarantees a greeting even if the agent-level field hasn't propagated yet, and personalises it with the actual user name (no template variable substitution needed). Note: ElevenLabs requires "Overrides → First message" to be enabled in the agent settings for this to take effect — if it isn't, step 1 alone still fixes it.

### 3. Verify

After deploy, the `useAutoSyncTools` hook fires once on next login (because `TOOLS_VERSION` bumped), pushing `first_message` to ElevenLabs. The next call should open with George speaking the greeting within ~1s of `onConnect`.

## Files changed

- `supabase/functions/_shared/foreman-tool-definitions.ts` — add `AGENT_FIRST_MESSAGE`, bump version
- `supabase/functions/sync-agent-tools/index.ts` — include `first_message` in PATCH body
- `src/contexts/VoiceAgentContext.tsx` — add `overrides.agent.firstMessage` to `startSession`

No DB changes, no new secrets.
