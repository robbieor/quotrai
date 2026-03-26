

## Fix Landing Page Demo Video — Replace Quotr with Foreman

### Problem
The pre-rendered MP4 (`/quotr-demo.mp4`) on the landing page still shows "Quotr" branding throughout all 7 scenes. The Remotion source files also reference `quotr-logo.png` and display "Quotr" text.

### Steps

**Step 1: Copy Foreman logo into Remotion assets**
- Copy `src/assets/foreman-logo.png` → `remotion/public/images/foreman-logo.png`

**Step 2: Update all Remotion scene files**

| File | Changes |
|------|---------|
| `remotion/src/scenes/Scene2MeetQuotr.tsx` | Rename to `Scene2MeetForeman.tsx`. Change "Meet **Quotr**" → "Meet **Foreman**". Change `quotr-logo.png` → `foreman-logo.png`. Update tagline to "Your AI office manager." |
| `remotion/src/scenes/Scene3CreateQuote.tsx` | Replace all `quotr-logo.png` → `foreman-logo.png` |
| `remotion/src/scenes/Scene4SendQuote.tsx` | Replace all `quotr-logo.png` → `foreman-logo.png` |
| `remotion/src/scenes/Scene5ConvertJob.tsx` | Replace `quotr-logo.png` → `foreman-logo.png` |
| `remotion/src/scenes/Scene7Closing.tsx` | Replace `quotr-logo.png` → `foreman-logo.png`. Change "Quotr" text → "Foreman". Change "Try Quotr free for 30 days" → "Try Foreman free for 14 days" |
| `remotion/src/MainVideo.tsx` | Update import from `Scene2MeetQuotr` → `Scene2MeetForeman` |

**Step 3: Re-render the MP4**
- Run the Remotion render script to produce `foreman-demo.mp4`
- Copy output to `public/foreman-demo.mp4`

**Step 4: Update landing page video reference**
- `src/components/landing/DemoVideoSection.tsx`: Change `src="/quotr-demo.mp4"` → `src="/foreman-demo.mp4"`

### Files Changed

| File | Summary |
|------|---------|
| `remotion/src/scenes/Scene2MeetQuotr.tsx` → `Scene2MeetForeman.tsx` | Rebrand scene |
| `remotion/src/scenes/Scene3CreateQuote.tsx` | Logo swap |
| `remotion/src/scenes/Scene4SendQuote.tsx` | Logo swap |
| `remotion/src/scenes/Scene5ConvertJob.tsx` | Logo swap |
| `remotion/src/scenes/Scene7Closing.tsx` | Logo + text swap |
| `remotion/src/MainVideo.tsx` | Update import |
| `remotion/public/images/foreman-logo.png` | New asset |
| `src/components/landing/DemoVideoSection.tsx` | Update video src |
| `public/foreman-demo.mp4` | New rendered video |

