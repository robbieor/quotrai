

## Launch-Critical Integration Audit & Fix Plan

### Current Status

| Integration | Status | Issue |
|---|---|---|
| **George AI Chat** | ✅ Working | `LOVABLE_API_KEY` set, `george-chat` edge function uses Lovable AI gateway correctly, SSE streaming implemented |
| **ElevenLabs Voice** | ✅ Wired | `ELEVENLABS_API_KEY` set via connector, agent ID hardcoded, token endpoint exists — needs live test only |
| **Google Maps** | ✅ Not needed | Address autocomplete uses Nominatim (free, no API key required). `GOOGLE_MAPS_API_KEY` is set but unused. No code references it for address lookup. Safe to keep as-is. |
| **Google OAuth** | ✅ Working | Lovable Cloud manages Google OAuth automatically. `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set. `useAuth.ts` calls `signInWithOAuth({ provider: "google" })` correctly. Should work out of the box. |

### Verdict: No code changes needed

All four integrations are either fully functional or correctly scaffolded:

1. **George AI Chat** — The `george-chat` edge function calls `ai.gateway.lovable.dev` with `LOVABLE_API_KEY`. The frontend streams via SSE. This is wired end-to-end.

2. **ElevenLabs Voice** — The connector-managed `ELEVENLABS_API_KEY` is configured. The `elevenlabs-agent-token` function fetches conversation tokens. The `useElevenLabsAgent` hook uses `@elevenlabs/react` with WebRTC. This needs a live test (tap the voice button) but the code path is complete.

3. **Google Maps** — Not actually used. All address autocomplete goes through Nominatim (free, open-source). The `GOOGLE_MAPS_API_KEY` secret exists but nothing calls it for addresses. No cost, no breakage.

4. **Google OAuth** — Lovable Cloud provides managed Google OAuth. The `signInWithGoogle` function in `useAuth.ts` is standard Supabase OAuth. The secrets are set. This should work on the published domain.

### Recommended Next Step

Instead of code changes, these need **live testing**:

1. Open the app → Login page → tap "Sign in with Google" → verify redirect works
2. Open George AI → type a message → verify streaming response appears
3. Open George AI → tap the voice/mic button → verify ElevenLabs connects and responds
4. Create a customer → type an address → verify Nominatim suggestions appear

All four are test-and-verify tasks, not build tasks.

