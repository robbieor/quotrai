

# Fix Foreman AI Voice Connection — Investor Demo Ready

## Root Cause

The console logs show: `"v1 RTC path not found. Consider upgrading your LiveKit server version"`. The installed `@elevenlabs/react` v0.14.3 bundles a LiveKit WebRTC client that negotiates a signaling path the ElevenLabs servers no longer support. The latest SDK version is **1.0.1** — a major version bump that resolves this exact WebRTC handshake failure.

The token is being generated successfully (edge function logs confirm `"Got conversation token successfully"`), but the client-side WebRTC negotiation fails every time.

## Fix

### 1. Upgrade `@elevenlabs/react` to v1.0.1

Update `package.json` dependency from `^0.14.3` to `^1.0.1`. The v1.x SDK maintains the same `useConversation` hook API surface — `startSession`, `endSession`, `sendUserMessage`, `sendUserActivity`, `clientTools`, `onConnect`, `onDisconnect`, `onMessage`, `onError` all remain unchanged. No code refactor needed.

### 2. Increase retry budget for demo reliability

Currently `MAX_RETRIES = 2` with a 500ms initial delay. For an investor demo, bump to `MAX_RETRIES = 3` with a 300ms initial delay — gives one more attempt with faster recovery. Update in `useVoiceConnectionReliability.ts`.

### 3. Reduce token pre-warm TTL race window

The current 45s TTL means a token fetched on FAB expansion could expire before the WebRTC handshake completes (tokens are valid ~60s). Reduce to 30s to guarantee freshness when the user actually taps "Call".

## Performance Notes (for investor demo)

The current architecture is already optimized for speed:
- Token pre-warming on FAB expansion (eliminates 1 network round-trip)
- Parallel mic permission + token fetch
- Deferred DB writes (conversation record created after handshake)
- Keep-alive interval prevents silence timeouts
- Webhook calls use `Promise.all` for parallel DB operations

The only blocker is the SDK version mismatch — once upgraded, connections should establish in under 3 seconds.

## Files Changed

| Action | File | Change |
|--------|------|--------|
| Edit | `package.json` | `@elevenlabs/react`: `^0.14.3` → `^1.0.1` |
| Edit | `src/hooks/useVoiceConnectionReliability.ts` | `MAX_RETRIES` 2→3, `INITIAL_RETRY_DELAY` 500→300 |
| Edit | `src/contexts/VoiceAgentContext.tsx` | `TOKEN_TTL_MS` 45000→30000 |

