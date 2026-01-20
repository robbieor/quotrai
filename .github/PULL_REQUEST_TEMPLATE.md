# Pull Request Checklist

## UI Consistency Requirements

Before submitting a PR that touches UI components, please verify:

### Design Tokens ✓
- [ ] All colors use CSS variables from `src/theme/variables.css`
- [ ] No hardcoded hex colors (run `npm run check:design`)
- [ ] Spacing uses standard tokens (`--spacing-xs`, `--spacing-sm`, etc.)
- [ ] Border radius uses standard tokens (`--radius-sm`, `--radius-md`, etc.)

### Typography ✓
- [ ] Font sizes use theme variables (`--font-size-body`, `--font-size-h1`, etc.)
- [ ] Font weights use theme tokens (`--font-weight-regular`, `--font-weight-semibold`, etc.)
- [ ] Proper heading hierarchy (H1 → H2 → H3)

### Components ✓
- [ ] Using shared UI components from `src/components/ui/` where applicable
- [ ] Buttons follow the Button component variants (primary, secondary, tertiary)
- [ ] Cards have NO shadows (per design guidelines)
- [ ] Status badges use the StatusBadge component
- [ ] Form inputs use the Input component

### Layout & Spacing ✓
- [ ] 8px grid alignment verified
- [ ] Consistent padding/margin using spacing tokens
- [ ] Touch targets are at least 44x44px

### Accessibility ✓
- [ ] Color contrast meets WCAG AA (4.5:1 minimum)
- [ ] Interactive elements have focus states
- [ ] Labels visible above inputs (not placeholder-only)
- [ ] Error messages are descriptive

### Icons ✓
- [ ] Using Lucide React icons (Feather style) only
- [ ] Correct icon sizes per context (nav: 24px, action: 22px, list: 20px, form: 18px)
- [ ] No emojis in UI

## Verification Commands

```bash
# Check for design violations
npm run check:design

# Run linting
npm run lint
```

## Design Reference
See `design_guidelines.md` in the repository root for the complete design system specification.
