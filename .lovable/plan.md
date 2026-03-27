

## Voice Agent — Sub-3s Connection Speed

### Root Cause Analysis

From the session replay, connection took **~15 seconds**: user tapped at 805s, "Retrying (1/2)" appeared at 809s, finally connected at 820s. Three compounding problems:

1. **Redundant data fetching** — `FloatingTomButton` already loads `teamId` and `userId` on mount, but `startConversation` fetches them again via `Promise.allSettled` (2 extra DB round-trips)
2. **No token pre-warming** — The ElevenLabs conversation token is only fetched after the user taps "Call". This token request goes: client → edge function → auth check → ElevenLabs API (~1-2s)
3. **First attempt failing + retry delay** — Attempt 1 consistently fails, triggering a 1s backoff + second attempt. This suggests a race condition or cold-start issue

### Solution: Pre-warm + Eliminate Redundancy

**Strategy**: Fetch the token the moment the user expands the FAB (shows intent to call), and pass already-loaded context instead of re-fetching it.

### Changes

| File | Change |
|------|--------|
| `src/contexts/VoiceAgentContext.tsx` | Add `preWarmToken()` method that fetches + caches a conversation token. Accept pre-loaded context in `startConversation` to skip the 2 redundant DB calls. Remove `supabase.rpc("get_user_team_id")` and `supabase.auth.getUser()` from the connection flow — use the context passed in |
| `src/components/layout/FloatingTomButton.tsx` | Call `preWarmToken()` when FAB expands (`isExpanded` becomes true). Pass the already-loaded `profile.id`, `profile.team_id`, `profile.full_name` directly to `startConversation` instead of letting it re-fetch |
| `src/hooks/useVoiceConnectionReliability.ts` | Remove unused `runPreflightCheck` method (dead code). Reduce `INITIAL_RETRY_DELAY` from 1000ms to 500ms for faster recovery |

### Expected Result

```text
Current flow (15s):
  Click → [fetch mic + token + teamId + user] → attempt 1 fails → 1s wait → attempt 2 → connected

New flow (<3s):
  FAB opens → [pre-fetch token in background]
  Click → [mic only, context already loaded, token cached] → connect → done
```

### No database or edge function changes required.

