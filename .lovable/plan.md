

# Voice-Enabled Demo Chat on Landing Page

## Problem
The demo chat is text-only. Visitors can't experience George's voice — which is a major differentiator. The full voice agent (ElevenLabs Conversational AI) requires authentication, so it can't be used anonymously on the landing page.

## Approach: Hybrid Voice Demo

Combine three existing pieces without needing a new ElevenLabs agent or authentication changes:

1. **Voice Input** → Browser Web Speech API (`SpeechRecognition`) — free, no API key, works in Chrome/Safari/Edge
2. **AI Reasoning** → Existing `george-chat` edge function with `demo_mode: true` — already built
3. **Voice Output** → Existing `elevenlabs-tts` edge function — speaks George's response back using the George voice (voice ID `JBFqnCBsd6RMkjVDRZzb`)

This gives visitors the full "talk to George" experience within the 3-message cap, without exposing any authenticated endpoints.

## Changes

### 1. Edit `src/components/landing/DemoChat.tsx`

- Add a **microphone button** next to the send button in the input bar
- On tap: start `SpeechRecognition`, show a pulsing mic indicator, transcribe speech to text, auto-send when speech ends
- After George responds: auto-play his response via `elevenlabs-tts` (fetch as blob, play via `Audio`)
- Add a small speaker toggle so users can mute voice output
- Show a "Tap to talk" hint on first open if browser supports speech recognition
- Graceful fallback: if `SpeechRecognition` is not supported (Firefox), hide the mic button — text-only still works

### 2. Edit `supabase/functions/elevenlabs-tts/index.ts`

- Allow unauthenticated requests when a `demo` flag is passed (rate-limit by IP or skip auth check for demo calls)
- Cap demo TTS to short text (under 200 chars) to prevent abuse

### No new edge functions. No new tables. No ElevenLabs agent changes.

## UX Flow

```text
Visitor taps "Try George Now" → Demo chat opens
  → Taps mic button → "Quote for Mrs. Patterson, EV charger"
  → Speech transcribed → sent to george-chat (demo_mode)
  → George's text response appears + auto-spoken aloud
  → 3 messages → "Like what you see? Sign up"
```

## Files

| Action | File |
|--------|------|
| Edit | `src/components/landing/DemoChat.tsx` — add mic button, Web Speech API, TTS playback |
| Edit | `supabase/functions/elevenlabs-tts/index.ts` — allow demo-mode unauthenticated calls with text length cap |

