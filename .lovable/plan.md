

## Fix: Voice Agent Immediately Disconnects After Greeting on Mobile

### Root Cause Analysis

The ElevenLabs voice agent connects, plays its greeting, then immediately hangs up. This is a **silence detection / inactivity timeout** issue, amplified on mobile:

1. **Mobile audio context suspension**: Mobile browsers aggressively suspend `AudioContext` and microphone streams when they detect inactivity. The WebRTC mic stream may be captured but the audio data isn't flowing to ElevenLabs, so the agent thinks nobody is there.

2. **No keep-alive signals**: The current code never calls `conversation.sendUserActivity()` — an ElevenLabs SDK method that signals "user is still here" and prevents the agent from ending the call due to perceived silence.

3. **No inactivity safeguard**: After `startSession`, there's no periodic activity ping. On mobile, the mic audio can take 1-2 seconds to actually start flowing through WebRTC, during which the agent's silence timer ticks down.

### Fix Plan (3 changes, all in `VoiceAgentContext.tsx`)

#### 1. Send activity signal immediately after connection
After `onConnect` fires, immediately call `sendUserActivity()` to tell the agent the user is present. This buys time for the mobile mic to warm up.

#### 2. Add a periodic keep-alive interval while connected
Start a `setInterval` that calls `conversation.sendUserActivity()` every 15 seconds while the session is active. Clear it on disconnect. This prevents the agent from timing out during natural pauses.

#### 3. Resume AudioContext on mobile after mic grant
After `getUserMedia` succeeds, explicitly resume the `AudioContext` (mobile browsers often start it in a suspended state). This ensures audio data actually flows.

### Files Changed

| File | Change |
|------|--------|
| `src/contexts/VoiceAgentContext.tsx` | Add `sendUserActivity()` on connect + 15s keep-alive interval + AudioContext resume |

### What this fixes
- Agent will no longer hang up immediately after greeting
- Mobile users will have a stable voice connection
- Natural pauses in conversation won't trigger disconnection

