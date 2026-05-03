## Remove the mobile header (Jobber-style)

On mobile, kill the top header bar entirely. Pages render straight from the safe-area top. Notifications and the user avatar move to a small floating pill in the top-right corner (matching the Jobber pattern in your reference).

### Changes

**1. `src/components/layout/DashboardLayout.tsx`**
- Wrap the existing `<header>` in `hidden md:flex` so it never renders on mobile.
- Add a new mobile-only floating pill, fixed top-right, that contains `<NotificationCenter />` and `<UserMenu />` on a white rounded-full background with subtle border + shadow. Positioned with `top-[max(0.5rem,env(safe-area-inset-top))] right-3`.
- Remove the top padding compensation on `<main>` for mobile (header was sticky, so main already starts at top — just ensure safe-area-top padding is applied to the page container instead, so content isn't under the status bar / floating pill).
- Container gets `pt-[max(1rem,env(safe-area-inset-top))] md:pt-0` (desktop keeps normal padding via existing `py-*`).

**2. Sidebar access**
- Already only reachable via the bottom-tab "More" button. No header trigger to remove since header is gone on mobile.

### Result on mobile
- No top bar background — page content (e.g. "Dashboard" heading) sits at the top.
- A small white pill in the top-right has the bell + avatar, floating over content like Jobber.
- Bottom tab bar unchanged.
- Desktop layout completely unchanged.

### Technical details
- Use Tailwind `md:` breakpoint, no JS branching, to avoid hydration flicker.
- Floating pill: `fixed z-30 top-[max(0.5rem,env(safe-area-inset-top))] right-3 md:hidden flex items-center gap-1 bg-background/90 backdrop-blur border border-border rounded-full shadow-sm px-1 py-1`.
- ReadOnlyBanner still renders above main content on mobile (it was outside the header).