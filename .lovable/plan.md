

## Fix: Quick Action Buttons Not Triggering

### Root Cause

Two distinct problems:

**Problem 1 — `action: null` buttons do nothing visible.** When "Create quote", "Create invoice", "Week ahead" etc. are tapped, `handleQuickAction` in `George.tsx` dispatches a `foremanai-quick-action` event with `{ message, autoSend: true }`. But `GeorgeMobileInput`'s event listener ignores `autoSend` — it only populates the text field without sending. The user sees their message appear as a bubble but nothing else happens because the input field gets filled silently (and on mobile, the keyboard may not even open).

**Problem 2 — Double handling.** `George.tsx` already calls `addMessage("user", message)` before dispatching the event. Then `GeorgeMobileInput` puts the message in the input field. If the user manually hits send, `sendChatMessage` would fire — but now `onUserMessage` adds a SECOND user bubble. The message appears twice.

### Fix

**In `George.tsx` `handleQuickAction`**: For `action: null` cases, call `sendChatMessage` directly instead of dispatching an event. This requires extracting the chat-sending logic or passing a callback.

The simplest fix: instead of the event dispatch, route `action: null` messages through the same `sendChatMessage` from `useForemanChat` hook, used directly in `George.tsx`.

### Changes

| File | Change |
|------|--------|
| `src/pages/George.tsx` | Add `useForemanChat` hook at page level for quick actions. In `handleQuickAction`, when `action` is null, call `sendChatMessage(message)` directly instead of dispatching an event. Remove the event dispatch path. |
| `src/components/george/GeorgeMobileInput.tsx` | Update `foremanai-quick-action` handler to check `autoSend` flag — if true, call `sendChatMessage(actionMessage)` instead of just populating the field. This handles events from `FloatingTomButton` too. |
| `src/components/george/GeorgeAgentInput.tsx` | Same `autoSend` handling for desktop input. |

### Detailed Logic

```text
Current flow (broken):
  Button tap → addMessage("user") → dispatch event → setMessage(text) → nothing sent

Fixed flow:
  Button tap → addMessage("user") → sendChatMessage(text) → AI responds → addMessage("assistant")
```

For the `action` path (webhook calls), keep as-is but ensure `setContext` has already been called during component mount (it is, via `GeorgeMobileInput`'s `useEffect`), so remove the redundant `setContext` call in `handleQuickAction`.

### No database changes required.

