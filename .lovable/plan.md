
Brutally honest diagnosis

- Exact failing step: the voice flow is breaking after token generation and mic permission, but before a real ElevenLabs session becomes usable.
- Evidence from the current app:
  - Mic starts: confirmed by frontend logs (`Microphone permission granted`).
  - Token generation works: confirmed by backend logs from `elevenlabs-agent-token` returning both a conversation token and signed URL.
  - Session handshake is failing: browser logs show:
    - `websocket closed ... code: 1006`
    - `Initial connection failed: v1 RTC path not found`
  - Webhook/task stage is not being reached:
    - no recent `george-webhook` logs during the failed voice attempt
    - no fresh transcript/assistant messages saved for the new voice conversation
- Root cause: the app currently treats `conversation.startSession()` resolving as “connected enough”, but the actual transport fails asynchronously right after. Because of that:
  1. the code records a voice conversation as if startup succeeded
  2. the UI can look alive / mic can be active
  3. the WebSocket fallback is not triggered reliably
  4. no transcript arrives, so no client tool calls fire, so no webhook runs
- Classification: primary issue is integration/frontend state management, not missing secrets. The key and agent ID appear valid. Secondary risk: agent tool config drift may still exist, but it is not the first blocker.

What I will fix

1. Harden the ElevenLabs connection handshake
- Update `src/contexts/VoiceAgentContext.tsx`
- Stop treating `startSession()` success as a real connection
- Require a confirmed `onConnect` event before marking voice as connected or creating a DB conversation
- Add a timeout window for WebRTC handshake
- If WebRTC never reaches `onConnect`, automatically tear it down and retry using the signed URL path
- If both paths fail, surface the exact stage and error instead of falling through silently

2. Add end-to-end voice debug state
- Add a temporary visible debug panel for Foreman AI voice showing:
  - mic permission: idle / granted / failed
  - token fetch: pending / success / failed
  - transport path: WebRTC or WebSocket
  - session connected: yes/no
  - transcript received: latest transcript text
  - tool call triggered: function name
  - backend action sent: yes/no
  - backend response status/result
  - final action status
  - last error details
- Make it visible on the Foreman AI experience and easy to disable later

3. Instrument transcript and client-tool stages
- In `src/contexts/VoiceAgentContext.tsx`:
  - log all key SDK events (`conversation_initiation_metadata`, transcript, agent response, disconnect, error)
  - track whether any user transcript is actually arriving
  - track whether any client tool is invoked
- Wrap every client tool call to `george-webhook` with structured debug entries:
  - requested function
  - payload summary
  - response success/failure
  - returned message

4. Fix false-positive UI states
- Do not show effective “live call” state until actual connection is confirmed
- Prevent creating `george_conversations` records until handshake truly succeeds
- Improve visible status labels to match reality:
  - Listening = connected and ready
  - Processing = transcript/tool execution in progress
  - Webhook sent = backend action dispatched
  - Action completed = backend responded successfully
  - Error = exact failing stage shown

5. Verify tool/webhook chain after transport fix
- Confirm frontend client tools still match the agent tool schema source of truth
- If needed, re-sync agent tools via `sync-agent-tools`
- Verify `george-webhook` is called with the expected function name + parameters once transcript/tool execution starts
- Confirm successful webhook results are reflected in app state / cache invalidation

Files involved

- `src/contexts/VoiceAgentContext.tsx` — main fix; handshake, fallback, debug state, event logging
- `supabase/functions/elevenlabs-agent-token/index.ts` — keep token/signed URL responses explicit; expand error detail if needed
- `src/components/layout/FloatingTomButton.tsx` — connection state messaging if needed
- `src/components/layout/ActiveCallBar.tsx` — ensure “Listening” only appears after real connect
- new temporary component, likely `src/components/george/VoiceDebugPanel.tsx` — visible debug UI
- optionally `src/pages/George.tsx` — mount the debug panel in the Foreman AI interface

Implementation sequence

1. Refactor connection logic so `onConnect` is the only success gate
2. Add explicit async fallback from failed/stalled WebRTC to signed URL transport
3. Add structured debug state machine in context
4. Add visible debug panel
5. Instrument webhook and action execution stages
6. Re-check whether tool sync drift exists only after transport is healthy

Expected result after the fix

- If the transport is broken, the app will clearly say so and show which stage failed
- If WebRTC fails but signed URL works, Foreman AI should still connect reliably
- Once connected, transcript arrival and backend action execution will be observable live
- If the webhook layer fails next, we’ll finally see that explicitly instead of the current silent failure

Manual verification still needed after implementation

- Test on the actual device/browser where it is failing
- Confirm:
  - greeting is heard
  - transcript appears in debug panel
  - a known command triggers a backend action
  - backend response status is shown
  - resulting record/task appears in the app
- Also verify the fallback path by forcing/observing a WebRTC failure scenario

Bottom line

- This is not “working.”
- The current break is before transcript and webhook execution.
- The highest-probability real bug is that the app is misclassifying an incomplete ElevenLabs session startup as a successful connection, while the actual RTC transport dies immediately afterward.
- I will fix that first, then instrument the rest of the chain so the next failure, if any, is undeniable and visible.
