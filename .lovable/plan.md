

## Problem: Red End-Call Button Not Appearing on Mobile

### Root Cause

The `startConversation` flow in `VoiceAgentContext.tsx` has a mobile-specific issue:

1. **Line 553**: `getUserMedia({ audio: true })` is called — this works because it's close to the user gesture
2. **Line 580**: The mic stream tracks are **immediately stopped** (just used to check permission)
3. **Lines 596-640**: After multiple `await` calls (token fetch, etc.), the ElevenLabs SDK internally calls `getUserMedia` again to get its own audio stream
4. **On mobile (especially iOS)**: This second `getUserMedia` call happens outside the user gesture context. Mobile browsers may silently block it, causing the WebRTC connection to fail or hang — so `onConnect` never fires, `status` never becomes `"connected"`, and the red button never appears

The button itself is coded correctly — it turns red when `isConnected` is true. The problem is the connection never fully establishes on mobile.

### Fix

**Keep the initial mic stream alive** and pass it to the SDK instead of discarding it and letting the SDK request its own.

#### Step 1: Pass mic stream through to the SDK session

In `startConversation` (VoiceAgentContext.tsx):
- Remove the `micStream.getTracks().forEach(track => track.stop())` on line 580
- Store the stream and pass it to `startAndWaitForConnect` so the SDK uses the already-authorized stream
- In `startAndWaitForConnect`, pass `mediaStream: micStream` to `VoiceConversation.startSession()` — the ElevenLabs SDK accepts a `mediaStream` option to avoid calling `getUserMedia` internally

#### Step 2: Clean up stream on disconnect/cancel

- Stop the mic stream tracks in `stopConversation` and `cancelConnection` callbacks
- Store the stream in a ref so it can be cleaned up from anywhere

#### Step 3: Add a mobile fallback for the floating button

As a safety net, in `FloatingTomButton.tsx`:
- Also check for `isConnecting` state to show the red button — if the connection is in progress for more than a few seconds on mobile, show a "Tap to end" affordance so users aren't stuck

### Files to Change

1. **`src/contexts/VoiceAgentContext.tsx`** — Keep mic stream alive, pass to SDK, clean up on disconnect
2. **`src/components/layout/FloatingTomButton.tsx`** — Minor: ensure the red button is visible during extended connecting states on mobile

