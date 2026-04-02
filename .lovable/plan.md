

# Switch Demo Chat Voice to Free Browser SpeechSynthesis

## What Changes

Replace the ElevenLabs TTS call in the demo chat with the browser's built-in `window.speechSynthesis` API. This eliminates all ElevenLabs costs for anonymous visitors while keeping the voice experience. ElevenLabs remains reserved for authenticated/paying users.

## How It Works

The `speakResponse` function in `DemoChat.tsx` currently calls the `elevenlabs-tts` edge function. We replace it with:

```typescript
const utterance = new SpeechSynthesisUtterance(text);
utterance.lang = "en-GB";
utterance.rate = 1.0;
utterance.pitch = 1.0;
// Pick a male British voice if available
const voices = speechSynthesis.getVoices();
const preferred = voices.find(v => v.lang === "en-GB" && v.name.includes("Male"));
if (preferred) utterance.voice = preferred;
speechSynthesis.speak(utterance);
```

- Free, zero API calls, works offline
- Supported in Chrome, Safari, Edge, Firefox
- Stop/cancel works via `speechSynthesis.cancel()`
- No edge function changes needed

## Quality Note

Browser voices are noticeably less natural than ElevenLabs. We add a subtle hint in the demo: *"Sign up to hear George's real voice"* — turning the quality gap into a conversion lever.

## Files

| Action | File |
|--------|------|
| Edit | `src/components/landing/DemoChat.tsx` — replace `speakResponse` with `SpeechSynthesis`, remove ElevenLabs fetch, update voice toggle hint |

No backend changes. No new files.

