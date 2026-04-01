

# Align Foreman AI Chat Screen with Landing Page Visual Design

## Problem

The landing page shows a polished chat mockup with:
- Soft green user bubbles (`bg-primary/10` with `border-primary/20`)
- Assistant bubbles with light background and border (`bg-muted/50 border border-border`)
- A header with avatar, "Foreman AI" name, and green "Online" dot
- A pill-shaped input bar with mic icon left, arrow icon right

The actual Foreman AI chat screen uses:
- Solid green user bubbles (too heavy, doesn't match)
- No bubble at all for assistant messages on mobile (just floating text)
- A different header layout (pill badge style, not the card header from the mockup)
- Different input bar styling

## Plan

### 1. Update `GeorgeMessageList.tsx` — match landing page bubble styles

**Mobile user bubble** (line 156-162):
- Change from `bg-primary text-primary-foreground` to `bg-primary/10 border border-primary/20 text-foreground` with `rounded-br-md`
- This matches the landing page's soft green bubbles

**Mobile assistant bubble** (line 145-153):
- Wrap content in a bubble container: `bg-muted/50 border border-border rounded-2xl rounded-bl-md px-4 py-2.5`
- Currently it's just raw text with no background — add the bubble

**Desktop bubbles** (line 175-192):
- Apply same style changes for consistency

### 2. Update `GeorgeMobileHeader.tsx` — match landing page header

Replace the current pill badge layout with the landing page style:
- Full-width header with avatar on left, "Foreman AI" title + "Online" green dot below
- Remove the `bg-muted rounded-full` pill wrapper
- Match the landing page header: avatar, name, status dot in a clean row

### 3. Update `GeorgeMobileInput.tsx` — match landing page input bar

Style the input to match:
- `bg-background rounded-xl border border-border px-4 py-2.5`
- Mic icon left (green/primary), arrow right
- Placeholder: "Talk or type to Foreman AI..."

## Files

| Action | File |
|--------|------|
| Edit | `src/components/george/GeorgeMessageList.tsx` — soft green user bubbles, bordered assistant bubbles |
| Edit | `src/components/george/GeorgeMobileHeader.tsx` — landing page header style with Online dot |
| Edit | `src/components/george/GeorgeMobileInput.tsx` — match landing page input bar styling |

No database changes. No functionality changes. Visual alignment only.

