
# Fix the real Foreman AI voice failure

Do I know what the issue is? Yes.

## What is actually wrong
The current failure is now more specific than “ElevenLabs might be down.”

1. The endless pulsing is a real UI bug:
- `FloatingTomButton.tsx` and `GeorgeMobileInput.tsx` keep pulsing off local `isConnecting`
- the “End Call” state only appears when `status === "connected"`
- during a failed handshake, users get no real cancel/end control

2. The current WebRTC -> WebSocket fallback is not reliably working:
- `src/contexts/VoiceAgentContext.tsx` uses `useConversation().startSession()`
- in the ElevenLabs React provider, `startSession()` is `void` and internally guarded by a pending lock
- when WebRTC times out, the app calls `endSession()` and immediately tries fallback
- but the provider’s pending lock can still be active, so the next `startSession()` is ignored
- result: fallback/retries become fake attempts, pulsing continues, and no real connection is established

This is primarily a frontend integration/state-management bug, not just a secret-key problem.

## Files involved
- `src/contexts/VoiceAgentContext.tsx`
- `src/components/layout/FloatingTomButton.tsx`
- `src/components/george/GeorgeMobileInput.tsx`
- `src/components/george/VoiceDebugPanel.tsx`
- optionally `src/components/layout/ActiveCallBar.tsx`

## Fix plan

### 1. Rebuild the session controller in `VoiceAgentContext.tsx`
Replace the current wrapper-driven retry flow with a truly controlled connection flow.

- Use app-owned connection phases:
  - `idle`
  - `requesting_mic`
  - `fetching_token`
  - `dialing_webrtc`
  - `dialing_websocket`
  - `connected`
  - `cancelling`
  - `failed`
- Add an `attemptId` so stale callbacks from old attempts cannot mutate the UI
- Track the active transport explicitly (`webrtc` / `websocket`)
- Only mark connected after the live session is actually established
- Clear connecting state immediately on failure/cancel

### 2. Stop using the current fallback pattern that gets blocked
In `VoiceAgentContext.tsx`:

- move connection orchestration to a lower-level session flow so each attempt is truly sequential and awaitable
- if WebRTC fails/times out, fully end that attempt before starting WebSocket fallback
- do not rely on “call `endSession()` and immediately call `startSession()` again” through the current wrapper
- make fallback explicit and serial, not overlapping

### 3. Add a real cancel connection action
Expose `cancelConnection()` from the voice context.

Behavior:
- if user taps while dialing, cancel immediately
- stop pulse immediately
- clear retry state/debug state
- ignore late callbacks from cancelled attempts
- never leave the UI stuck in “connecting”

### 4. Fix the button logic so it reflects reality
#### `FloatingTomButton.tsx`
- while dialing: show cancel/X behavior, not expandable menu behavior
- if connecting, clicking the button should cancel the attempt
- pulse only while the current active attempt is genuinely dialing
- show `PhoneOff` only for connected sessions, but show a clear cancel state while dialing

#### `GeorgeMobileInput.tsx`
- do not disable the phone button during connecting
- switch it to a cancel action while dialing
- replace generic “Connecting…” with specific states like:
  - Requesting mic
  - Authenticating voice
  - Trying WebRTC
  - Switching to fallback
  - Connection failed

### 5. Improve the debug panel so it shows the real failure point
Update `VoiceDebugPanel.tsx` to include:
- app connection phase
- active transport
- whether current attempt was cancelled
- transcript received
- webhook triggered
- webhook response status
- final action status
- last error

This makes it obvious whether the failure is:
- mic
- token
- WebRTC
- WebSocket fallback
- transcript/tool call
- webhook/action handling

### 6. Keep webhook/task instrumentation in place
Once connection is restored, keep the current webhook debug trail and make it more explicit:
- tool invoked
- webhook sent
- response code/result
- action completed / failed

## Expected result
After this fix:

- the pulse will stop if connection fails or user cancels
- there will be a visible cancel path during dialing
- WebSocket fallback will be a real second attempt, not a blocked no-op
- users will either:
  - connect and hear/use Foreman AI, or
  - see the exact failing stage clearly

## Manual verification after implementation
1. Tap the phone button
2. Confirm the UI moves through real phases, not endless pulse
3. Cancel during dialing and confirm pulse stops immediately
4. Test a failed WebRTC case and confirm WebSocket fallback actually starts
5. Confirm one successful live session:
   - connected state appears
   - greeting or transcript arrives
   - debug panel shows transcript/tool/webhook flow
6. Confirm failed attempts surface a clear error instead of silent looping

## Technical detail
```text
Current broken behavior
tap call
  -> local isConnecting = true
  -> WebRTC attempt starts
  -> timeout/failure
  -> endSession + immediate fallback
  -> wrapper still has pending lock
  -> fallback start is ignored
  -> pulse continues
  -> no connected state
  -> no end-call control

Planned behavior
tap call
  -> phase: requesting_mic
  -> phase: fetching_token
  -> phase: dialing_webrtc
  -> if fail: fully cancel old attempt
  -> phase: dialing_websocket
  -> if success: connected
  -> if fail: failed + pulse stops
  -> user can cancel at any point
```
