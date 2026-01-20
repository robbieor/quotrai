# Quotr Design System - Elevation Rules

## Overview
This document defines the elevation system for Quotr's modern SaaS visual design. All components must follow these rules to maintain visual consistency.

---

## Surface Levels

### 1. Canvas (`--color-surface-canvas`)
- **Color**: `#F5F5F5`
- **Usage**: Page backgrounds only
- **Shadow**: None
- **Example**: Dashboard background, page container

### 2. Surface (`--color-surface`)
- **Color**: `#FFFFFF`
- **Usage**: Cards, panels, content containers
- **Shadow**: `--shadow-sm`
- **Border**: `1px solid var(--color-border-subtle)`
- **Example**: Card component, DataTable, MetricCard

### 3. Elevated (`--color-surface-elevated`)
- **Color**: `#FFFFFF`
- **Usage**: Modals, dropdowns, right rail panels, assistant
- **Shadow**: `--shadow-md`
- **Border**: Optional, use `--color-border-subtle` if needed
- **Example**: Modal dialogs, dropdown menus, elevated panels

---

## Shadow System

### Allowed Shadows
```css
--shadow-none: none;                              /* Flat elements */
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);      /* Normal cards */
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);  /* Elevated panels */
--shadow-fab: 0 2px 4px rgba(0, 0, 0, 0.1);      /* FAB only */
```

### Usage Rules
| Shadow Level | Use Case | Example Components |
|--------------|----------|-------------------|
| `none` | Flat UI elements | Buttons, badges, list items |
| `sm` | Normal elevation | Card, DataTable, MetricCard |
| `md` | High elevation | Modals, dropdowns, right rail |
| `fab` | Floating Action Button | FAB only |

---

## Component Guidelines

### Card Component
```css
background-color: var(--color-surface);
border: 1px solid var(--color-border-subtle);
box-shadow: var(--shadow-sm);
```

### Modal / Dialog
```css
background-color: var(--color-surface-elevated);
box-shadow: var(--shadow-md);
```

### Dropdown / Popover
```css
background-color: var(--color-surface-elevated);
box-shadow: var(--shadow-md);
border: 1px solid var(--color-border-subtle);
```

### FAB (Floating Action Button)
```css
box-shadow: var(--shadow-fab);
```

---

## Enforcement Rules

### ✅ DO
- Use CSS custom properties for all shadows
- Use `--shadow-sm` for cards and content panels
- Use `--shadow-md` for modals and elevated panels
- Use `--shadow-fab` for FAB only
- Keep shadows in `components/ui` directory

### ❌ DON'T
- **Never** use custom `box-shadow` values outside `components/ui/`
- **Never** use `drop-shadow` filters for elevation
- **Never** create shadows darker than `rgba(0, 0, 0, 0.1)`
- **Never** use colored shadows (except for focus states)

---

## Status Badge Colors

### Semantic Colors Only
```css
--color-success: #059669;  /* Paid, completed */
--color-warning: #D97706;  /* Sent, pending */
--color-error: #DC2626;    /* Overdue, failed */
--color-text-disabled: #9CA3AF;  /* Draft, inactive */
```

### Badge Backgrounds (10% opacity)
```css
--color-status-paid-bg: rgba(5, 150, 105, 0.1);
--color-status-sent-bg: rgba(217, 119, 6, 0.1);
--color-status-overdue-bg: rgba(220, 38, 38, 0.1);
--color-status-draft-bg: rgba(209, 213, 219, 0.1);
```

---

## Button Variants

### Primary
- Background: `var(--color-primary)`
- Text: `#FFFFFF`
- Shadow: `none`

### Secondary
- Background: `transparent`
- Border: `1px solid var(--color-border)`
- Text: `var(--color-text-primary)`
- Shadow: `none`

### Tertiary (Ghost)
- Background: `transparent`
- Border: `none`
- Text: `var(--color-primary)`
- Shadow: `none`

---

## Audit & Linting

### Manual Audit
Search for custom shadows in CSS files:
```bash
grep -r "box-shadow:" client/src --exclude-dir=components/ui
```

### Expected Result
- ✅ No custom `box-shadow` values outside `components/ui/`
- ✅ All shadows use CSS custom properties
- ✅ Only 4 shadow levels exist (none, sm, md, fab)

---

## Migration Checklist

When updating existing components:
- [ ] Replace custom `box-shadow` with `var(--shadow-sm)` or `var(--shadow-md)`
- [ ] Update `border` to use `var(--color-border-subtle)`
- [ ] Ensure `background-color` uses `var(--color-surface)` or `var(--color-surface-elevated)`
- [ ] Remove any `drop-shadow` filters used for elevation
- [ ] Test visual consistency across light/dark modes (if applicable)

---

## Questions?

If you're unsure which shadow level to use:
1. **Is it a card or panel?** → Use `--shadow-sm`
2. **Is it a modal or dropdown?** → Use `--shadow-md`
3. **Is it a FAB?** → Use `--shadow-fab`
4. **Is it flat (button, badge)?** → Use `--shadow-none`
