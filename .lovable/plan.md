

## Fix Template Picker for Mobile

### Problem
The "Use Template" dialog dumps all 28 trade categories as buttons, filling the entire mobile screen before any templates are visible. Completely unusable on phones.

### Changes

**1. Hide category filter when user has a trade set (TemplatePicker.tsx)**
- If `userTradeCategory` exists, auto-lock to that category and **don't render the category buttons at all**
- Show a small text label like "Showing: Electrician templates" with a "Show all" link to optionally expand
- Only show the full category grid if user explicitly clicks "Show all" or has no trade set

**2. Mobile-optimized dialog (TemplatePicker.tsx)**
- On mobile, render as a full-screen sheet (`DrawerContent` / full-height dialog) instead of a centered dialog
- Reduce template card padding from `p-4` to `p-3` on mobile
- Remove the separate "Use" button on each card — tapping the whole card already triggers selection
- Compact the metadata row (duration, rate) into a single line

**3. If "Show all" is expanded, use a compact dropdown**
- Replace the flex-wrap button grid with a `<Select>` dropdown for category switching
- Keeps category access available without eating screen space

### Files to edit
- `src/components/quotes/TemplatePicker.tsx` — all changes in this one file

