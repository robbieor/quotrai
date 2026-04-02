

# Fix Sidebar — Force Dark Navy Background

## Problem
The `sidebar.tsx` UI component has hardcoded background classes that override the dark navy CSS variables:
- **Line 56**: Inner sidebar div uses `bg-muted-foreground text-secondary` instead of `bg-sidebar text-sidebar-foreground`
- **Line 78**: `SidebarHeader` uses `bg-primary-foreground` (white background)
- **Line 81**: `SidebarFooter` uses `bg-muted` (light grey)
- **Line 87**: `SidebarContent` uses `bg-muted` (light grey)
- **Line 90**: `SidebarGroup` has `shadow-sm` adding unwanted light shadows
- **Line 94**: `SidebarGroupLabel` uses `text-primary-foreground` instead of inheriting

The CSS variables (`--sidebar-background: 220 26% 12%`) are correct but completely ignored because these hardcoded Tailwind classes take precedence.

## Fix

All in `src/components/ui/sidebar.tsx`:

1. **Line 56** — Change inner `div` from `bg-muted-foreground text-secondary` → `bg-sidebar text-sidebar-foreground`
2. **Line 78** — `SidebarHeader`: Change `bg-primary-foreground` → `bg-sidebar`
3. **Line 81** — `SidebarFooter`: Change `bg-muted` → `bg-sidebar`
4. **Line 87** — `SidebarContent`: Change `bg-muted` → `bg-sidebar`
5. **Line 90** — `SidebarGroup`: Remove `shadow-sm`
6. **Line 94** — `SidebarGroupLabel`: Change `text-primary-foreground` → `text-sidebar-foreground`

One file, six class swaps. The Foreman wordmark + logo header will immediately appear white-on-dark-navy.

## Files

| Action | File |
|--------|------|
| Edit | `src/components/ui/sidebar.tsx` |

