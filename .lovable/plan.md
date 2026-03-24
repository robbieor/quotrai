

# Fix: George Quotes Not Saving & Action Preview + Floating Button UX

## Three Problems

1. **AI says "saved" before user confirms** — the deferred execution flow works, but the AI's follow-up text claims the record was created
2. **Duplicate messages** — both `onAssistantMessage` (text bubble) and `onStructuredResponse` (action plan card) fire, duplicating content
3. **Floating button users have no feedback** — when using George from the floating button on any page (not /george), the user gets navigated to /george but may miss the confirmation gate entirely

## Changes

### 1. Override AI message for deferred actions — `supabase/functions/george-chat/index.ts`

After the follow-up AI call (line ~948), when `deferredExecution` is true, force the message:

```typescript
if (deferredExecution) {
  finalMessage = "I've prepared everything — please review and confirm below to save.";
}
```

Also update the synthetic tool result (line 898) to be clearer:
```
"Action prepared — waiting for your confirmation before saving to the system"
```

### 2. Skip duplicate text bubble — `GeorgeAgentInput.tsx` & `GeorgeMobileInput.tsx`

In both `handleSendMessage` and the quick action handler: when `response.data.action_plan` exists, do NOT call `onAssistantMessage`. Only call `onStructuredResponse`. The text is already embedded in `action_plan.text_response`.

**GeorgeAgentInput.tsx** (lines 170-179):
```typescript
if (response.data.action_plan) {
  onStructuredResponse?.(response.data, newConversationId);
} else {
  onAssistantMessage?.(assistantMessage, newConversationId);
}
```

Same pattern in quick action handler (lines 114-120) and in **GeorgeMobileInput.tsx** (lines 127-135).

### 3. Floating button: show toast confirmation instead of silent navigation — `FloatingTomButton.tsx`

The floating button currently navigates to /george and fires a delayed event. This is fragile — the user lands on a new page and may not see the confirmation gate.

**New behavior**: When a quick action from the floating button creates a record (after the user confirms on /george), show a **toast notification** with a link. But more importantly, the quick action handler already navigates to /george — the real fix is ensuring the action plan renders prominently when the user arrives.

Add a toast after successful confirmation in `George.tsx` `handleConfirmation`:
```typescript
if (action === "confirm") {
  toast.success("Record created successfully", {
    action: { label: "View", onClick: () => navigate("/quotes") }
  });
}
```

### 4. Make confirmation gate unmissable — `ActionConfirmationGate.tsx`

Add a pulsing amber border animation and auto-scroll-into-view when status is `needs_confirmation`:

- Add `animate-pulse` on the border
- Add `useEffect` with `scrollIntoView({ behavior: 'smooth' })` on mount
- Increase padding and font size slightly

### 5. Auto-scroll to confirmation on /george arrival from floating button

In `George.tsx`, when `displayItems` changes and the last item is an action plan with `status === "needs_confirmation"`, auto-scroll to it. This ensures users arriving from the floating button see the gate immediately.

## Files to modify

| File | Change |
|------|--------|
| `supabase/functions/george-chat/index.ts` | Override `finalMessage` when deferred; clearer synthetic result |
| `src/components/george/GeorgeAgentInput.tsx` | Skip `onAssistantMessage` when `action_plan` present |
| `src/components/george/GeorgeMobileInput.tsx` | Same — skip duplicate message |
| `src/components/george/action-mode/ActionConfirmationGate.tsx` | Pulsing border, auto-scroll into view |
| `src/pages/George.tsx` | Toast with nav link on confirm; auto-scroll to pending confirmation |

