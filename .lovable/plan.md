

# Foreman AI Chat — UX Overhaul

## Problems Identified

From the screenshots and code review:

1. **Input text box overflow**: The text input placeholder "Talk or type to Foreman AI..." visually bleeds outside the rounded input container on mobile — the `min-h-[44px]` on the inner `<input>` combined with the container `min-h-[48px]` and padding creates misalignment
2. **Placeholder text colour**: Input placeholder text uses `text-muted-foreground` (grey) — user wants white text inside the input (the send button area has a green bg, but the text field itself needs better contrast treatment)
3. **User message bubble text**: Already white (`text-white`) — confirmed working
4. **Header layout cramped**: Back button + avatar + "Foreman AI / Online" + hamburger menu + notifications + user avatar all squeezed into one row on 402px viewport
5. **Context indicator bar feels disconnected**: "George knows about 127 active jobs..." sits awkwardly between header and chat
6. **Welcome screen pre-chat**: The quick actions grid and greeting are functional but feel generic — not "industry-leading AI assistant" quality
7. **Sidebar (Conversations panel)**: Clean but the conversation items use basic text truncation, no preview snippets

## Fixes

### 1. Mobile Input Bar — Fix Overflow and Styling
- **File**: `src/components/george/GeorgeMobileInput.tsx`
- Change outer container from `rounded-xl` to `rounded-2xl` with proper overflow hidden
- Remove `min-h-[44px]` from inner input — let padding control height
- Set input text colour explicitly: `text-foreground` with `placeholder:text-muted-foreground/60`
- Ensure the input container clips content with `overflow-hidden`

### 2. Mobile Header — Tighten Layout
- **File**: `src/components/george/GeorgeMobileHeader.tsx`
- Remove the hamburger `Menu` button from the header row — move conversation history access to a swipe gesture or a dedicated icon in the top-left (replace back arrow with a sidebar toggle when on the George page)
- Reduce avatar size from `md` to `sm`
- Drop "Online" status text on very small screens or make it a simple green dot only

### 3. Context Indicator — Integrate Into Header
- **File**: `src/components/george/ContextIndicator.tsx`
- Reduce visual weight: smaller text, remove the Shield icon, make it a single-line subtle bar
- Use `text-[10px]` and lighter opacity

### 4. Welcome Screen — Elevate to ChatGPT-Level Quality
- **File**: `src/components/george/GeorgeWelcome.tsx` (mobile section)
- Cleaner greeting with larger, bolder typography
- Reduce "Needs attention" cards to a single compact alert strip instead of horizontally scrolling cards
- Quick action buttons: use pill-shaped buttons instead of grid cards — more like ChatGPT's suggestion chips
- Remove the "Today" stats row from the welcome (it clutters — dashboard already shows this)
- Weekly analysis section: collapse by default, keep as-is

### 5. Message Bubbles — Polish
- **File**: `src/components/george/GeorgeMessageList.tsx`
- User bubbles: already `bg-primary text-white` — confirmed good
- Assistant bubbles: tighten border radius, remove the outer `border border-border` (cleaner look), keep `bg-muted/50`
- "George is thinking" indicator: use a more elegant animation (3 fading dots, not bouncing)

### 6. Sidebar — Mobile Polish
- **File**: `src/components/george/GeorgeSidebar.tsx`
- Add first-message preview snippet under each conversation title (truncated to 1 line)
- Active conversation: use `bg-primary/10` highlight instead of default

## Files Changed

| Action | File |
|--------|------|
| Edit | `src/components/george/GeorgeMobileInput.tsx` |
| Edit | `src/components/george/GeorgeMobileHeader.tsx` |
| Edit | `src/components/george/ContextIndicator.tsx` |
| Edit | `src/components/george/GeorgeWelcome.tsx` |
| Edit | `src/components/george/GeorgeMessageList.tsx` |
| Edit | `src/components/george/GeorgeSidebar.tsx` |

