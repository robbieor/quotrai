

# Auto-Sync Voice Agent Tools on Deploy

You're right — no user should have to manually sync tools. The tools should be automatically pushed to the ElevenLabs agent every time the edge functions are deployed (i.e., whenever we update the definitions).

## What changes

### 1. Make `sync-agent-tools` self-triggering on deploy

Update the `sync-agent-tools` edge function to also accept a **no-auth GET request** with a deploy secret, so it can be called automatically. Alternatively (and simpler): call the sync at the end of `george-webhook` startup or from the shared definitions file.

**Simplest approach**: Have the `george-webhook` edge function call the ElevenLabs PATCH API directly on its first invocation (or on a schedule), using a hash of the tool definitions to detect changes. But edge functions are stateless, so this adds latency to every call.

**Best approach**: Remove the auth requirement from `sync-agent-tools` (it already has `verify_jwt = false` by default) and **auto-call it from the frontend on app startup** — silently, once per session, no user action needed. This ensures every user always has the latest tools synced.

### 2. `src/components/settings/ForemanAISettings.tsx`

- Remove the "Sync Voice Tools" button entirely (no longer needed).

### 3. `src/App.tsx` or a top-level hook (e.g., `useAutoSyncTools.ts`)

- Create a hook that runs once on app mount (for authenticated users only).
- Calls `supabase.functions.invoke("sync-agent-tools")` silently in the background.
- Uses `sessionStorage` to avoid calling more than once per browser session.
- Failures are silent — no toast, no UI disruption.

### 4. `supabase/functions/sync-agent-tools/index.ts`

- Keep the existing logic but make auth optional (allow both authenticated calls and internal calls).
- Or simply remove the auth check since the function is already deployed with `verify_jwt = false` and the ElevenLabs API key is the real gate.

## Summary

Every time a user opens Foreman, the latest tool definitions are silently pushed to the voice agent. No manual button. No customer action. Tools are always current.

