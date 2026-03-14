

## Why Pages Are Blank

The app is failing to build due to a **TypeScript type mismatch** in the ElevenLabs stub. The preview shows a blank page because the build never completes — no JS is served.

### Root Cause

`src/contexts/elevenlabs-stub.ts` defines `ConnectionStatus` with 3 values:
```
"disconnected" | "connected" | "connecting"
```

But `src/contexts/VoiceAgentContext.tsx` defines its own `ConnectionStatus` with 4 values:
```
"connected" | "connecting" | "disconnecting" | "disconnected"
```

At line 632 of VoiceAgentContext.tsx, `conversation.status` (from the stub) is assigned to the context's `status` field. TypeScript rejects this because the stub's type doesn't include `"disconnecting"`.

### Fix

**One file change** — update `src/contexts/elevenlabs-stub.ts` to include all 4 status values:

```typescript
type ConnectionStatus = "disconnected" | "connected" | "connecting" | "disconnecting";
```

This aligns the stub's type with what VoiceAgentContext expects, the build will succeed, and all pages will render.

### Additional Cleanup (minor)

`src/App.css` contains default Vite template CSS (`#root { max-width: 1280px; ... }`) that constrains the layout width. This file should be emptied or its `#root` styles removed — the real styles are in `src/index.css`.

