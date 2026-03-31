

# Fix Foreman AI Sidebar — Mobile Layout Issues

## Problems Visible in Screenshot
1. The conversation item expand/collapse chevron (`>`) adds clutter — most users don't need expandable descriptions in a sidebar
2. Selected item (green highlight) bleeds to the edge and overlaps with the main content area
3. The `X` close button and `...` menu crowd the row, making it feel cramped
4. The overall sidebar items lack clear visual separation

## Fix Plan

### Edit: `src/components/george/GeorgeSidebar.tsx`

**ConversationItem component (lines 540-670+):**
- Remove the expand/collapse chevron entirely — always show `MessageSquare` icon instead. The expandable description feature adds complexity with no real value in a conversation list
- Remove the `X` close button from selected items (the sidebar close or tapping another item handles deselection)
- Make the context menu (`...`) always visible on mobile instead of hover-only, but smaller and right-aligned
- Tighten padding: `px-2 py-2` instead of `px-3`, keep `min-h-[48px]` for touch targets
- Use `rounded-lg` instead of `rounded-xl` for tighter feel
- Cap the selected highlight background to stay within the sidebar bounds (ensure no overflow)

**Mobile sidebar container (line 139):**
- Add `overflow-hidden` to prevent any child from bleeding outside
- Reduce the conversation list `space-y-1` to `space-y-0.5` for tighter grouping

**Remove expandable description rendering entirely** (the `isExpanded && hasDescription` block around lines 660-680) — it's unused clutter

### Result
- Clean, single-line conversation items with icon + truncated title + subtle menu
- No overlapping elements
- Proper mobile touch targets without visual noise

