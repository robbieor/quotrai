## Fix

Use the new uploaded logo PNG (already a teal rounded-square "r." mark) directly, with no wrapper, tile, or background.

The asset `src/assets/foreman-logo.png` (and `revamo-logo.png`) has been replaced with the uploaded image.

### Revert wrappers — three locations

1. `src/pages/Landing.tsx` line ~91 (nav):
```tsx
<img src={foremanLogo} alt="revamo" className="h-8 w-8 sm:h-9 sm:w-9" />
<span className="text-lg sm:text-xl font-bold tracking-tight font-manrope lowercase">revamo</span>
```

2. `src/pages/Landing.tsx` line ~207 (footer):
```tsx
<img src={foremanLogo} alt="revamo" className="h-7 w-7 sm:h-8 sm:w-8" />
```

3. `src/components/layout/AppSidebar.tsx` line ~112 (sidebar):
```tsx
<img src={foremanLogo} alt="revamo" className="h-9 w-9" />
```

No `bg-primary`, no `rounded-lg`, no padding wrapper — the artwork already includes its own teal rounded shape.

Reply "go" to apply.