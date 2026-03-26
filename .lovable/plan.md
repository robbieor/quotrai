

## Fix Foreman AI Voice Agent Freeze & Achieve Sub-3s Connection

### Root Causes of the 15s Freeze

1. **Serial waterfall of 5 blocking steps**: Mic permission → preflight edge function call → DB insert → dynamic variables build → `withRetry(attemptConnection)`. Each awaits the previous.
2. **Preflight is redundant**: It calls `elevenlabs-agent-token` to test connectivity, then `attemptConnection` calls it again implicitly via the signed URL. That's **two round trips** to ElevenLabs before the user hears anything.
3. **15-second CONNECTION_TIMEOUT**: If the preflight is slow, the user stares at a spinner for 15s before anything happens.
4. **Retry with exponential backoff**: 2s → 4s → 8s delays between retries. If the first attempt times out at 15s, the user waits 15s + 2s + 15s = 32s before seeing a failure.
5. **No UI feedback during connection**: The button shows a spinner but there's no "Connecting..." status bar or audio cue — feels frozen.
6. **WebSocket fallback is slower than WebRTC**: When a signed URL is obtained, the code uses `connectionType: "websocket"` instead of the recommended `"webrtc"` with a conversation token.

### The Fix — Parallel, WebRTC-First, Instant Feedback

**Step 1: Switch to WebRTC with conversation tokens (fastest path)**

The `elevenlabs-agent-token` edge function currently fetches a **signed URL** (for WebSocket). Change it to fetch a **conversation token** (for WebRTC) — this is ElevenLabs' recommended protocol with lower latency.

| File | Change |
|------|--------|
| `supabase/functions/elevenlabs-agent-token/index.ts` | Change API call from `get-signed-url` to `conversation/token` endpoint. Return `{ token, agentId }` instead of `{ signedUrl }` |

**Step 2: Eliminate the redundant preflight check**

Remove the separate `runPreflightCheck()` call. The token fetch in `attemptConnection` IS the preflight — if it fails, we fall back to public agent.

| File | Change |
|------|--------|
| `src/contexts/VoiceAgentContext.tsx` | Remove `runPreflightCheck()` call from `startConversation`. Merge token fetch into `attemptConnection` directly. |

**Step 3: Parallelize mic + token + DB conversation creation**

Run all three in parallel with `Promise.all`:
- `navigator.mediaDevices.getUserMedia()` — mic permission
- `supabase.functions.invoke("elevenlabs-agent-token")` — get token
- `supabase.rpc("get_user_team_id")` + `supabase.auth.getUser()` — user context

This cuts 3 serial round trips into 1 parallel batch.

| File | Change |
|------|--------|
| `src/contexts/VoiceAgentContext.tsx` | Restructure `startConversation` to use `Promise.allSettled` for mic + token + context in parallel |

**Step 4: Reduce timeout and retries**

- Cut `CONNECTION_TIMEOUT` from 15s → 8s
- Reduce `MAX_RETRIES` from 3 → 2
- Reduce `INITIAL_RETRY_DELAY` from 2s → 1s

| File | Change |
|------|--------|
| `src/hooks/useVoiceConnectionReliability.ts` | Update constants: timeout 8s, retries 2, delay 1s |

**Step 5: Add instant "Connecting..." UI feedback**

Show a pulsing status bar immediately when the user taps the call button — before any async work starts. This prevents the "frozen" feeling.

| File | Change |
|------|--------|
| `src/components/george/GeorgeMobileInput.tsx` | Show connecting state bar with animation when `isConnecting` is true: "Connecting to Foreman AI..." with a pulse dot |

**Step 6: Defer DB conversation creation**

Move the `george_conversations.insert()` to AFTER the WebRTC session connects (in the `onConnect` callback). This removes another serial DB call from the critical path.

| File | Change |
|------|--------|
| `src/contexts/VoiceAgentContext.tsx` | Move conversation DB insert from `startConversation` to the `onConnect` callback |

### Expected Result

| Metric | Before | After |
|--------|--------|-------|
| Time to first audio | 8-15s (or timeout) | 2-3s |
| Worst case (retry) | 32s | 10s |
| UI feedback | Spinner only | Animated "Connecting..." bar |
| Connection protocol | WebSocket (slow) | WebRTC (fast) |
| Serial network calls | 5 | 1 parallel batch |

### Files Changed

| File | Summary |
|------|---------|
| `supabase/functions/elevenlabs-agent-token/index.ts` | Switch to conversation token endpoint for WebRTC |
| `src/contexts/VoiceAgentContext.tsx` | Parallelize startup, remove preflight, defer DB insert, use WebRTC |
| `src/hooks/useVoiceConnectionReliability.ts` | Tighten timeout/retry constants |
| `src/components/george/GeorgeMobileInput.tsx` | Add "Connecting..." status bar |

