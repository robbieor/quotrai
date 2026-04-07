

# Fix Auth Pages to Match Login Theme

## Problem
ForgotPassword and ResetPassword pages use dark navy (`bg-[#0f172a]`) backgrounds with white text. The login page (the reference screenshot) uses a clean light theme: white card on `bg-background`, default text colors, green primary button, no dark backgrounds.

## Fix
Strip all dark navy styling from both pages and match the Login.tsx pattern exactly:
- `bg-background` wrapper instead of `bg-[#0f172a]`
- Default `Card` with no custom border/bg overrides
- Standard text colors (remove all `text-white`, `text-white/60`, etc.)
- Default `Input` styling (remove `bg-white/10 border-white/20 text-white`)
- Keep the green CTA button (`bg-[#00E6A0] text-[#0f172a]`) — matches login "Sign in" button
- Standard `variant="ghost"` / `variant="outline"` for secondary buttons without white overrides

## Files Changed

| File | Change |
|------|--------|
| `src/pages/ForgotPassword.tsx` | Remove all dark navy classes, match Login.tsx card/input/button styling |
| `src/pages/ResetPassword.tsx` | Same — remove dark navy from all 3 states (loading, success, form) |

