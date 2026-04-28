## Goal
Eliminate the leftover right-side "Foreman AI is speaking…/Listening…" pill in `FloatingTomButton.tsx` so the bottom-center `ActiveCallBar` is the only widget visible during an active call.

## Change
**`src/components/layout/FloatingTomButton.tsx`** — delete lines 208–225 (the `{isConnected && (...)}` Voice Activity Indicator block). Nothing else in the file depends on it; `isSpeaking` is no longer referenced after removal, so also drop it from the `useGlobalVoiceAgent()` destructure to keep the file clean.

## Result
During a live call:
- Bottom-center `ActiveCallBar` pill (mute / open chat / end call) — only widget
- Round floating phone button — hidden (already gated by `!isConnected && !isConnecting`)
- Right-side speaking/listening pill — removed

No other files affected. No behavior change outside the voice UI.