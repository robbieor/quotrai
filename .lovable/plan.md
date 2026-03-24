

# Agent Working Visibility System

## What We're Building

A reusable `<AgentWorkingPanel>` component that shows animated step-by-step progress for any AI/automated task. First integration: the "Send Preview to Myself" flow in Branding Settings. Designed to be reused for quote creation, invoice generation, and all Foreman AI actions.

## Component Design

```text
┌──────────────────────────────────────┐
│  ⚡ Foreman AI is working…           │
│                                      │
│  ✓ Preparing document structure      │
│  ✓ Applying branding settings        │
│  ● Rendering logo and layout…        │  ← spinner on active step
│  ○ Generating line items             │  ← dimmed pending steps
│  ○ Calculating totals                │
│  ○ Building PDF                      │
│  ○ Sending preview email             │
│                                      │
│  ─── on success ───                  │
│  ✅ Preview sent to rob@example.com  │
│  [Send Another]  [Download PDF]      │
│                                      │
│  ─── on failure ───                  │
│  ✓ Preparing document structure      │
│  ✗ Building PDF — Error message      │  ← red, with error text
│  [Retry]                             │
└──────────────────────────────────────┘
```

## Changes

### 1. New component — `src/components/shared/AgentWorkingPanel.tsx`

A self-contained, reusable panel that accepts:
- `steps: { id, label }[]` — the step definitions
- `currentStepIndex: number` — which step is active (-1 = not started)
- `completedSteps: Set<string>` — which steps are done
- `failedStep?: { id, error }` — if a step failed
- `isComplete: boolean` — all done
- `successMessage?: string` — e.g. "Preview sent to rob@email.com"
- `successActions?: { label, onClick, variant }[]` — CTAs after success
- `onRetry?: () => void` — retry handler on failure
- `title?: string` — defaults to "Foreman AI is working…"

Renders:
- Vertical timeline with connector lines (reuses the visual style from `ActionTimeline.tsx`)
- Steps animate in sequentially with staggered `fade-in` (150ms delay per step)
- Active step has a spinning `Loader2` icon
- Completed steps have green `Check` icon
- Failed step has red `AlertCircle` with error message
- Success state shows a green banner with optional CTA buttons
- Whole panel appears as a card with subtle border, can be used inline or in a dialog

### 2. New hook — `src/hooks/useAgentWorkflow.ts`

Manages the step-by-step state machine:

```typescript
const { startWorkflow, completeStep, failStep, reset, state } = useAgentWorkflow(steps);
```

- `startWorkflow()` — begins at step 0, advances `currentStepIndex`
- `completeStep(id)` — marks step done, advances to next
- `failStep(id, error)` — marks step failed, stops
- `reset()` — clears all state
- `state` — `{ currentStepIndex, completedSteps, failedStep, isComplete, isRunning }`

Each step transition has a configurable minimum display time (400ms) so the user sees the animation even if the actual operation is instant.

### 3. Integrate into BrandingSettings — `src/components/settings/BrandingSettings.tsx`

Replace the simple `previewSending` spinner button with the `AgentWorkingPanel`:

- When user clicks "Send Preview to Myself", show the panel (as a Dialog overlay)
- Steps: Preparing structure → Applying branding → Rendering layout → Generating line items → Calculating totals → Building PDF → Sending email
- Each step completes as the actual code progresses through the `handleSendPreview` function
- On success: show "Preview sent to {email}" with "Send Another" and "Close" buttons
- On failure: show the failed step with error and "Retry" button
- The existing toast notifications remain as secondary feedback

### 4. Predefined step templates — in `AgentWorkingPanel.tsx`

Export preset step arrays for common workflows:

```typescript
export const PREVIEW_EMAIL_STEPS = [
  { id: "structure", label: "Preparing document structure" },
  { id: "branding", label: "Applying branding settings" },
  { id: "layout", label: "Rendering logo and layout" },
  { id: "line_items", label: "Generating line items" },
  { id: "totals", label: "Calculating totals" },
  { id: "pdf", label: "Building PDF" },
  { id: "email", label: "Sending preview email" },
];

export const QUOTE_CREATION_STEPS = [...];
export const INVOICE_CREATION_STEPS = [...];
```

## Files

| File | Change |
|------|--------|
| `src/components/shared/AgentWorkingPanel.tsx` | New reusable component |
| `src/hooks/useAgentWorkflow.ts` | New state machine hook |
| `src/components/settings/BrandingSettings.tsx` | Replace spinner with AgentWorkingPanel in a Dialog |

## How It Integrates With Foreman AI

The existing `ActionTimeline` in the George chat is chat-specific — it renders inside `LiveActionFeed` and uses `AIActionPlan` types. The new `AgentWorkingPanel` is standalone and page-agnostic. In future, the George `ActionTimeline` can be refactored to use `AgentWorkingPanel` internally, unifying the visual language across the entire app.

## Error Handling

- If PDF generation fails → step "Building PDF" shows red with the error
- If email send fails → step "Sending preview email" shows red
- Retry button calls `handleSendPreview` again from scratch with a fresh panel
- All errors also trigger a toast for users who dismiss the panel

