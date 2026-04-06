
What is actually wrong:
- You are right to call this out. The current behavior can look like “it’s working” because the app requests microphone access first, so iPhone/Android shows a recording prompt/state even when the ElevenLabs session never connects.
- Based on the code, the most likely failure is in the token/agent handshake, not the mic.
- The current implementation also hides the real problem by silently falling back to a “public agent” path if token generation fails. That makes the UI look active while George never greets or connects.

Why I believe that:
1. `src/contexts/VoiceAgentContext.tsx`
   - `startConversation()` requests `getUserMedia()` before the actual ElevenLabs connection.
   - So “start recording” can happen even when ElevenLabs is broken.
   - If token fetch fails, it falls back to:
     - `usePublicAgent: true`
     - then `conversation.startSession({ agentId, connectionType: "webrtc" })`
   - That fallback can mask the real outage and make the app appear to be trying.
2. `supabase/functions/elevenlabs-agent-token/index.ts`
   - If `ELEVENLABS_API_KEY` is missing, invalid, or lacks the correct agent permission, it does not hard-fail for the UI.
   - It returns a fallback response instead of a clear blocking error.
3. Recent debug evidence
   - No recent logs appeared for `elevenlabs-agent-token`, which suggests the token path is either not succeeding or not being reached in the way we expect.
   - There are also no recent network hits containing “elevenlabs” in the captured client snapshot.
4. This explains your exact symptom
   - phone says recording
   - no George greeting
   - no connected state
   - no real session established

Most likely root causes to verify/fix:
1. ElevenLabs API key issue
   - missing secret
   - expired/rotated key
   - wrong permission scope
   - especially missing conversational/agent write permission
2. Public-agent fallback is broken or no longer valid
   - if the agent is no longer publicly callable, fallback will never produce a usable session
3. WebRTC session starts are failing after mic permission
   - current code retries, but only shows generic messaging
4. Agent configuration changed in ElevenLabs
   - wrong agent ID
   - greeting / first message disabled
   - public/private setting changed

Implementation plan:
1. Remove the misleading silent fallback
   - Update `VoiceAgentContext.tsx` so failed token fetch is treated as a real connection error, not “try public agent anyway”.
   - Only use direct `agentId` mode if we explicitly know the agent is configured for that mode.
2. Make token failures visible
   - Update `elevenlabs-agent-token` to return clear error states:
     - missing key
     - unauthorized key
     - permission/scope error
     - invalid agent
   - Keep CORS/auth intact, but stop pretending the voice path is available when it is not.
3. Improve frontend error reporting
   - In `VoiceAgentContext.tsx`, log and surface which step failed:
     - microphone granted
     - token fetched
     - session starting
     - connected
   - Show a precise toast like “Voice service authentication failed” instead of generic “connection failed”.
4. Tighten connection gating
   - Do not show the “connected / dialing” style as if it’s a working call until the SDK actually fires `onConnect`.
   - If mic opens but token/session fails, immediately reset the dialing state and explain why.
5. Verify agent mode
   - Check whether this Foreman agent should be token-based only.
   - If yes, remove public-agent fallback entirely.
   - If no, make fallback explicit and validate it against the current agent configuration.
6. Add focused debugging hooks
   - Add targeted console logs around:
     - token invoke result
     - fallback selection
     - `conversation.startSession()` payload mode
     - SDK error object normalization
   - This will make the next failure unambiguous instead of hidden.

Files to update:
- `src/contexts/VoiceAgentContext.tsx`
- `supabase/functions/elevenlabs-agent-token/index.ts`

Expected result after fix:
- Tapping the phone will still request mic permission, but if ElevenLabs auth/agent setup is broken, the app will clearly say so instead of acting like it’s working.
- If credentials and agent config are valid, George should connect and greet again.
- If not, we’ll have a concrete failure reason rather than a false positive.

Technical details:
```text
Current flow
tap phone
  -> microphone opens
  -> token may fail
  -> app silently falls back
  -> no real session
  -> user sees “recording” but hears nothing

Planned flow
tap phone
  -> microphone opens
  -> token fetch must succeed
  -> start ElevenLabs session
  -> onConnect => connected UI
  -> if token/session fails => explicit error, no fake dialing state
```
