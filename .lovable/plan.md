# Fix voice greeting + persistent call indicator

Two related Foreman AI issues to address.

## Problem 1 — Voice agent skips greeting and uses written framework

George uses the "Insight / Impact / Action" structure on voice calls and dives in without saying hello. That framework is great for chat (markdown-friendly) but feels robotic on a phone call where the user expects a brief greeting and natural back-and-forth.

The shared system prompt lives in the ElevenLabs agent dashboard, but the SDK lets us override it per session via `overrides.agent.prompt.prompt` and `overrides.agent.firstMessage`.

### What we'll change

1. Pass voice-specific overrides when starting an ElevenLabs session in `src/contexts/VoiceAgentContext.tsx` (inside the `VoiceConversation.startSession` call).
2. **First message** — a short, warm greeting using the user's first name when known, e.g. _"Hey {name}, George here. What can I sort for you?"_ (falls back to _"Hey, George here. What can I sort for you?"_ when no name).
3. **Voice prompt override** — keep George's Irish-foreman personality and tool access, but tell him explicitly:
   - Always greet the caller on the first turn.
   - Speak in short, conversational sentences — no "Insight / Impact / Action" headers, no bullet lists, no markdown.
   - Confirm actions verbally before executing destructive ones (send, delete, mark paid).
   - When reporting numbers, say them naturally ("four thousand two hundred euro", not "€4,200.00").

### Dashboard prerequisite

For the SDK overrides to take effect, **First Message** and **System Prompt** overrides must be enabled in the ElevenLabs agent settings (Agent → Security → Enable overrides). If they aren't, the override is silently ignored. We will:
- Implement the override in code (no harm if disabled).
- Note in the response that the user should toggle "Allow overrides for First Message and System Prompt" in the ElevenLabs dashboard so it takes effect.

## Problem 2 — Floating call indicator disappearing during calls

The draggable call card and the bottom pill in `ActiveCallBar.tsx` should both stay on screen for the full call. Causes we identified that can make the indicator vanish or feel "gone":

- Drag handle currently lives on the **header**, but the entire card body has no fallback affordance — once the card is dragged off-screen on mobile (small viewports), only the bottom pill remains, and on iOS Safari the pill can sit behind the URL bar / home-indicator on landscape.
- The pill currently hides its status text on mobile (`hidden sm:flex`) — at 402px wide the user only sees a silent avatar + timer + buttons, which can read as "the call indicator vanished" because the obvious "Foreman AI listening" label is gone.
- When the user navigates between routes during a call, the pill remounts and briefly animates out/in.

### What we'll change in `src/components/layout/ActiveCallBar.tsx`

1. **Always show the status label** (Listening / Speaking / Muted) on mobile too — drop the `hidden sm:flex` and use a tighter layout so it fits at 360px. Timer stays visible.
2. **Stronger live-pulse ring** around the avatar in the pill so the indicator is unmistakable even at a glance while driving.
3. **Lift the pill above the iOS home-indicator and Safari URL bar** by using `bottom: max(1rem, env(safe-area-inset-bottom)) + 0.75rem` and bumping z-index to `z-[70]` so nothing overlaps it.
4. **Auto-recover the floating card** — if the card's stored position falls outside the current viewport (after rotation, sidebar open, browser chrome showing), snap it back to the top-right corner instead of leaving it off-screen. Already partially handled; we'll also re-snap on `visibilitychange` (returning to the tab) and on route change.
5. **Single-source visibility check** — assert in code that whenever `status === "connected"`, the bottom pill renders unconditionally (no path exclusions while a call is live). Right now `EXCLUDED_PATHS` (Landing, Login, Portal, etc.) hides the bar entirely. We'll keep excluding marketing/auth pages but **never** hide the pill mid-call: if a call is active and the route changes to an excluded path, still render the pill (the user must always be able to end the call).

## Files touched

- `src/contexts/VoiceAgentContext.tsx` — add `overrides` to `startSession` (firstMessage + voice prompt + language).
- `src/components/layout/ActiveCallBar.tsx` — mobile label, safe-area lift, z-index, viewport re-clamp on visibilitychange/route change, and pill-during-call on excluded paths.

## Out of scope

- We are **not** changing the chat/text George prompt — Insight/Impact/Action stays in `george-chat` for the chat UI.
- We are **not** modifying the ElevenLabs agent in their dashboard from code (not possible). After deploying, you'll need to toggle "Allow overrides" once in the ElevenLabs agent settings for the new greeting + tone to apply.
