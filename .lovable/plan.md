## Why this is still failing on mobile

Console shows nothing because the user is on `/index` (marketing page) where the floating button mounts — the disconnect happens, but no toast surfaces it and the timeline UI lives behind the chat page. Last time the close reason was a clean ElevenLabs payment block (`closeCode: 1002`). Now that billing is sorted, the most likely remaining causes — given the code in `VoiceAgentContext.tsx` — are:

1. **Stale pre-warmed token reused after payment fix.** `preWarmToken()` runs the moment the FAB is expanded and caches the token for 30s. A token minted while the account was in the payment-blocked state can still be returned (or rejected) when redialed. We never clear the cache after a failed connect.
2. **iOS audio session not held open.** The current code opens an `AudioContext`, resumes, then immediately `close()`s it (lines 661–663). On iOS Safari this releases the audio session before the WS opens, so the agent's first audio frame fails silently and the SDK drops the socket within ~1s. The hands-free silent-audio loop only runs on `/foreman-ai` per memory `voice-agent-hands-free-driving`.
3. **No keep-alive / wake lock on the landing route.** Calling from the FAB on `/index` means the OS may aggressively suspend the tab, which closes the WS before `onConnect` even resolves on slower mobile networks (>8s timeout fires).
4. **Silent UX:** all of the above currently look identical to the user — "nothing happens" — because the disconnect detail is only written to the in-memory debug timeline, never toasted.

## What this plan does

### 1. Always show the real failure reason

In `src/contexts/VoiceAgentContext.tsx` `onDisconnect`, when the disconnect happens **while we were trying to connect** (phase ≠ `connected`), surface a `toast.error` with the actual `details` payload (reason / closeCode / message). This alone turns "silent failure" into actionable information for any future incident.

### 2. Drop the cached token on every failure

- Clear `cachedTokenRef.current = null` inside the `onDisconnect` early-drop branch and inside the WebSocket catch block, not just on success.
- Add a `force` flag to `preWarmToken()` and call it with `force=true` after `stopConversation()` so the next attempt always mints a fresh token.

### 3. Hold an iOS-friendly audio session for the duration of the call

Replace the throwaway `AudioContext` block with a sustained one:

- Create a single module-level `AudioContext`, `resume()` it inside the click handler (still synchronous to the gesture).
- Start a tiny silent `OscillatorNode → GainNode(gain=0)` that runs for the lifetime of the call (already proven pattern in `voice-agent-hands-free-driving`).
- Stop and `close()` it in `stopConversation()` and in `onDisconnect`.

This keeps the iOS audio session alive across the WS handshake on Safari and Chrome iOS.

### 4. Engage `navigator.wakeLock` for the call, regardless of route

Move the wake-lock acquisition out of the `/foreman-ai` page hook and into `VoiceAgentContext` so it's active whenever a call is connected from the FAB on `/index`, `/dashboard`, etc. Release on `stopConversation` / `onDisconnect`.

### 5. Add a one-shot diagnostic toast on connect timeout

If the 8 s connect timeout fires, toast `"Voice didn't connect (timed out). Reason: <last debug event>"` so the user (and we) can see whether it was mic, token, or WS that hung.

## Files touched

```
src/contexts/VoiceAgentContext.tsx     core changes (1–5)
```

No DB / edge-function changes required — the previous `sync-agent-tools` fix and the ElevenLabs billing fix already addressed the server-side issues.

## Verification steps after the change

1. Open the deployed site on mobile Safari → tap "Call Foreman AI".
2. Expected: spinner → "Connected to Foreman AI" toast → speak → reply.
3. If it fails: a toast now shows the exact disconnect reason (closeCode + message). Paste that and I'll know whether it's billing, quota, or audio-session.

## Out of scope

- The `/foreman-ai` chat route already has its own keep-alive; we'll consolidate later, not in this fix.
- WebRTC path stays disabled (upstream SDK bug, per the existing comment).