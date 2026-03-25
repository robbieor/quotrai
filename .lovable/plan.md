

## Darken the Header and Sidebar Header Background

The `bg-muted-foreground` color (`hsl(215, 16%, 47%)`) is too light for these bars. We need a darker, more authoritative tone.

### Options

| Option | HSL | Hex approx | Description |
|--------|-----|-----------|-------------|
| A | `215 20% 35%` | ~#475569 | Slate-blue, noticeably darker |
| B | `220 20% 28%` | ~#394152 | Deep slate, more contrast |
| C | `222 30% 22%` | ~#273147 | Near-navy, premium feel |

### Recommended: Option A or B

Rather than changing the global `--muted-foreground` variable (which is used for gray text throughout the app), I'll introduce a custom utility color for these bars.

### Changes

**1. `src/index.css`** — Add a new CSS variable `--header-bg` under `:root`:
```css
--header-bg: 215 20% 35%;   /* Dark slate for header bars */
```

**2. `tailwind.config.ts`** — Add a `header` color mapping:
```ts
header: "hsl(var(--header-bg))",
```

**3. `src/components/layout/DashboardLayout.tsx`** — Change header from `bg-muted-foreground` to `bg-header`

**4. `src/components/layout/AppSidebar.tsx`** — Change SidebarHeader from `bg-muted-foreground` to `bg-header`

This keeps the gray text color (`muted-foreground`) untouched everywhere else.

