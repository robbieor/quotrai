

# Fix Password Reset Flow + Brand Theme

## Problems

1. **ResetPassword.tsx race condition** — The `useEffect` calls `getSession()` immediately on mount. When the user clicks the reset link, Supabase processes the recovery token from the URL hash via `onAuthStateChange`. But `getSession()` fires before the token is exchanged, finds no session, and redirects to `/forgot-password` with "Invalid or expired reset link." The reset page never loads.

2. **Bland styling** — Both `ForgotPassword.tsx` and `ResetPassword.tsx` use plain white Cards on a bare background. They don't match the dark navy (#0f172a) premium aesthetic used across the rest of Foreman (login page, dashboard, etc.).

## Fix

### 1. Fix the reset flow (ResetPassword.tsx)

Replace the `useEffect` session check with a proper `onAuthStateChange` listener that waits for the `PASSWORD_RECOVERY` event before allowing the form to render. This is the correct Supabase pattern:

```typescript
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      // Token exchanged — user can now set new password
      setReady(true);
    }
  });
  
  // Also check existing session (user may already be authenticated)
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) setReady(true);
  });
  
  // Timeout fallback — if no event after 5s, redirect
  const timeout = setTimeout(() => {
    if (!ready) {
      toast.error("Invalid or expired reset link.");
      navigate("/forgot-password");
    }
  }, 5000);
  
  return () => { subscription.unsubscribe(); clearTimeout(timeout); };
}, []);
```

Show a loading spinner until `ready` is true.

### 2. Brand both pages to match Foreman theme

Apply the dark navy command center aesthetic to both ForgotPassword and ResetPassword:

- **Dark navy background** (`bg-[#0f172a]`) with centered card — matching login page
- **Logo** at top of card (already present, keep it)
- **Primary green CTA buttons** (`bg-[#00E6A0] text-[#0f172a]`) instead of default
- **Card styling** — subtle border, slight shadow, rounded corners matching the login page
- **Typography** — use the same "Welcome back" / card description style from Login.tsx
- **Success states** — green gradient checkmark circle (already partially there, just needs navy bg context)

### Files Changed

| File | Change |
|------|--------|
| `src/pages/ResetPassword.tsx` | Fix session check race condition with `onAuthStateChange` + `PASSWORD_RECOVERY` event; apply dark navy branded theme |
| `src/pages/ForgotPassword.tsx` | Apply dark navy branded theme matching login page |

