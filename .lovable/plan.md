# Registry-Driven Voice Agent Screen Control

Goal: Give Foreman AI a controlled vocabulary for navigation, record opening, scrolling, highlighting, and progress reporting. The agent never sees raw paths or selectors — only enum keys validated against a single source of truth.

This builds on what already exists (`VoiceAgentContext` already dispatches `george:navigate` and `NavigationBridge` is already mounted) and replaces the loose `navigate_to_screen({ route: "/jobs" })` style with strictly validated enum-driven tools.

## What gets built

### 1. New files

**`src/lib/agentRegistry.ts`** — single source of truth
- `AGENT_ROUTES` — 8 keyed routes (dashboard, jobs, invoices, customers, quotes, workforce, reports, settings) mapped to actual app paths. We map `dashboard → /dashboard`, `workforce → /time-tracking` (existing route), and the rest 1:1.
- `AGENT_RECORDS` — 4 record builders (invoice, job, customer, quote) that return the URL for an id. Note: this app currently uses detail sheets, not detail routes, so these will navigate to the list page with a `?open=<id>` query param the list pages can read to auto-open the sheet (kept simple — listed pages do this in a follow-up if not already wired).
- `AGENT_SECTIONS` — 7 keyed sections (overdue-invoices, todays-jobs, revenue-kpis, workforce-status, recent-customers, ai-briefing, pending-quotes).
- `isRoute`, `isRecord`, `isSection` type guards.

**`src/lib/agentEvents.ts`** — typed `window.dispatchEvent` helpers for `foreman-agent-navigate`, `foreman-agent-scroll`, `foreman-agent-highlight`, `foreman-agent-progress`.

**`src/components/agent/AgentNavigationBridge.tsx`** — listens for nav + scroll events inside `<BrowserRouter>`, calls `useNavigate()`, and `scrollIntoView` on `[data-section="..."]` elements. Shows a sonner toast with the reason on navigate.

**`src/components/agent/AgentHighlightOverlay.tsx`** — fixed-position overlay that draws a pulsing primary-green ring around the matched `[data-section]` element for ~3.5s, with an optional label chip. Uses Foreman primary green (#22c55e) per brand identity.

**`src/components/agent/AgentProgressToast.tsx`** — listens for progress events and dispatches sonner toasts (`info` / `success` / `error` based on status).

### 2. App.tsx wiring

Inside `<BrowserRouter>`, alongside the existing `<NavigationBridge />` and `<LiveActionOverlay />`, mount:
```
<AgentNavigationBridge />
<AgentHighlightOverlay />
<AgentProgressToast />
```

The existing `NavigationBridge` (listens to `george:navigate`) stays — it powers the legacy `navigate_to_screen` tool. The new bridge handles the new controlled-vocabulary tools.

### 3. Tag DOM sections with `data-section`

Add `data-section="..."` attributes on the relevant containers:
- `src/pages/Dashboard.tsx` — wrap the AI briefing card (`ai-briefing`), revenue KPI row (`revenue-kpis`), today's jobs list (`todays-jobs`), recent customers list (`recent-customers`).
- `src/pages/Invoices.tsx` — overdue list/filter container (`overdue-invoices`).
- `src/pages/Quotes.tsx` — pending quotes container (`pending-quotes`).
- `src/pages/TimeTracking.tsx` — clock-in status panel (`workforce-status`).

Missing sections no-op with a console warning (per spec) — no crash.

### 4. Register the 5 new client tools

In `src/contexts/VoiceAgentContext.tsx` `clientTools` block, add:
- `navigate_to({ route, reason? })`
- `open_record({ type, id, reason? })`
- `scroll_to({ section })`
- `highlight_element({ section, label? })`
- `report_progress({ message, status? })`

All inputs validated via `isRoute` / `isRecord` / `isSection`. Invalid input returns a clear error string instead of dispatching. The legacy tools (`navigate_to_screen`, `highlight_record`, `show_progress_toast`) remain for backwards compatibility with the existing ElevenLabs agent config until the dashboard is updated.

### 5. ElevenLabs dashboard (manual user step)

The ElevenLabs agent config must add the 5 new tools with the enum parameters listed in the spec. We will surface a clear note in the response telling the user to add these via the ElevenLabs dashboard (we cannot edit it from code). The system prompt update is also a manual ElevenLabs dashboard step — we'll provide the exact prompt text.

## Technical notes

- The voice provider (`VoiceAgentProvider`) sits above `<BrowserRouter>` in `App.tsx`, so the window-event bridge pattern (already used by `NavigationBridge`) is mandatory — `useNavigate()` must be called from inside the router.
- Highlight overlay renders into a portal-free fixed div at z-index above sonner (`z-[9999]`) so it sits above `ActiveCallBar` (`z-[70]`) and modals.
- `AGENT_RECORDS` URLs assume future detail-route support; for now they navigate to `/invoices?open=<id>` style — list pages can read this in a future follow-up. The validation/contract is what matters now.
- No changes to `useElevenLabsAgent.ts` (deprecated path); only `VoiceAgentContext.tsx` (the active voice path).

## Acceptance

- "Open invoices" → `/invoices` + nav toast
- "Show overdue invoices" → navigates to `/invoices`, then green pulsing ring on overdue section
- Multi-step work → running/done toasts via `report_progress`
- Invalid `route: "foobar"` → returns `"Unknown route: foobar"`, no crash
- Adding a new page = one entry in `AGENT_ROUTES` + one ElevenLabs enum update
