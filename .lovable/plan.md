

# Add Voice Connection Visual Feedback (Pulse + Connected Indicator)

## Problem
1. When tapping the phone icon to connect to Foreman AI, there's no pulsing/ringing animation — it just shows a static spinner
2. When connected, there's no strong visual confirmation (like ChatGPT's glowing orb effect)
3. The connection may also be failing silently on some devices

## Changes

### 1. Add Pulsing Ring Animation to Phone Button While Connecting
**Files:** `src/components/george/GeorgeMobileInput.tsx`, `src/components/layout/FloatingTomButton.tsx`

- Replace the static `Loader2` spinner with the Phone icon wrapped in animated pulsing rings (like a phone ringing)
- Use concentric ring animations (`animate-ping` with staggered delays) around the button during `isConnecting` state
- The button itself gets a subtle scale-pulse animation

### 2. Add Connected State Glow Effect
**Files:** `src/components/george/GeorgeMobileInput.tsx`, `src/components/layout/FloatingTomButton.tsx`

- When `isConnected`, add a green glowing ring around the phone/end-call button
- Add a subtle breathing animation to the connected indicator bar
- Show a brief "Connected" toast/badge that fades after 2 seconds

### 3. Add Tailwind Keyframes for Ring Pulse
**File:** `tailwind.config.ts`

- Add `ring-pulse` keyframe: concentric circles expanding outward from the button
- Add `breathe` keyframe: subtle scale oscillation for connected state

### 4. Floating Button Enhancements
**File:** `src/components/layout/FloatingTomButton.tsx`

- During connecting: show pulsing rings radiating from the FAB (like an incoming call animation)
- When connected: change the voice activity indicator to include a green pulsing dot + "Connected to Foreman AI" initial state before switching to "Listening..."

## Technical Details

```text
Button States:
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Idle      │ ──▶ │  Connecting      │ ──▶ │   Connected     │
│  Phone icon │     │  Phone + rings   │     │  Green glow     │
│  Static     │     │  Pulsing outward │     │  PhoneOff icon  │
└─────────────┘     └──────────────────┘     └─────────────────┘
```

- Connecting: 3 concentric rings using `animate-ping` with opacity 0.3/0.2/0.1 and staggered animation-delay (0s, 0.3s, 0.6s)
- Connected: `box-shadow` glow animation cycling green intensity, plus a brief "Connected ✓" indicator

