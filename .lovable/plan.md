

## Mobile UX Overhaul Plan

### Problems Identified

1. **No mobile layout at all** -- The `DashboardLayout` always renders a 260px sidebar + TopBar. On mobile, the sidebar consumes the entire viewport width with no way to dismiss it, leaving zero room for content.

2. **Sidebar not responsive** -- No `@media` breakpoints exist in `Sidebar.module.css` or `DashboardLayout.module.css`. The sidebar is always visible and `position: sticky`.

3. **TopBar overflows on mobile** -- The search bar is 480px wide (max 45%), the greeting text, profile dropdown, and notifications all render inline, causing horizontal overflow on small screens.

4. **Profile page: 2-column grid is hardcoded** -- `gridTemplateColumns: "repeat(2, 1fr)"` is inline CSS with no responsive breakpoint, so form fields get crushed on mobile.

5. **Payments page: same issue** -- Inline grid with `minmax(300px, 1fr)` works somewhat but the cards still use inline styles with no mobile padding adjustments.

6. **Invoice form modal** -- The `.formRow` grid uses `repeat(3, 1fr)` with no responsive fallback. On mobile, three columns of date/status inputs become unusable.

7. **LineItemsEditor** -- 5-column grid (`1fr 80px 100px 100px 40px`) has no responsive breakpoint. On mobile this forces horizontal scroll or crushed inputs.

8. **DataTable** -- No responsive behavior. Full tables with 7 columns render at desktop width on mobile.

9. **FloatingAssistant** -- Fixed at `bottom: 24px; right: 24px` with `width: 360px`. This fills the entire mobile viewport width.

10. **PDF preview** -- No PDF preview component exists in the client code. The user may be referring to an external link or server-rendered view that's being framed. This needs clarification but the fix would involve ensuring any embedded view uses `width: 100%` and proper viewport sizing.

---

### Implementation Plan

#### 1. Mobile sidebar: off-canvas drawer with overlay
- Hide sidebar by default on screens < 768px
- Add a hamburger menu button to TopBar (visible only on mobile)
- Sidebar renders as a fixed overlay drawer with backdrop
- Tapping backdrop or a nav link closes the drawer
- Add `@media (max-width: 768px)` rules to `Sidebar.module.css` and `DashboardLayout.module.css`

#### 2. TopBar mobile adaptation
- Hide the search bar on mobile (or collapse to icon)
- Hide profile business name / role text, show only avatar
- Stack greeting text smaller
- Add hamburger icon on the left for sidebar toggle

#### 3. Profile page responsive form
- Replace inline `gridTemplateColumns: "repeat(2, 1fr)"` with a CSS class
- Add `@media (max-width: 640px)` to switch to single column
- Reduce padding on mobile

#### 4. Payments page responsive cards
- Extract inline styles to CSS module classes
- Add single-column layout on mobile

#### 5. Invoice modal form responsive
- Add `@media (max-width: 640px)` to `.formRow` to stack to 1 column
- Make modal full-screen on mobile (`width: 100vw; height: 100vh; border-radius: 0`)

#### 6. LineItemsEditor mobile layout
- On mobile, switch from 5-column grid to stacked card layout per line item
- Each item becomes a vertical card with labeled fields

#### 7. DataTable mobile adaptation
- Hide lower-priority columns on mobile (Date, Due date, Actions)
- Or switch to a card-based list view for mobile

#### 8. FloatingAssistant mobile sizing
- Reduce chat panel to `width: 100vw; height: 70vh` on mobile
- Ensure FAB doesn't overlap content

#### 9. Modal component full-screen on mobile
- Add `@media (max-width: 640px)` to `.modal` in `Modal.module.css`: full width/height, no border-radius

#### 10. PDF preview investigation
- Since no PDF preview component exists in the client, this likely refers to the server-rendered invoice view. Will need to check if a route like `/api/invoices/:id/pdf` is being loaded in an iframe/embed, and ensure it renders at full width on mobile.

---

### Files to modify
- `client/src/layouts/DashboardLayout.tsx` + `.module.css` -- mobile sidebar toggle state, responsive layout
- `client/src/components/Sidebar.tsx` + `.module.css` -- off-canvas drawer, overlay, auto-close on nav
- `client/src/components/TopBar.tsx` + `.module.css` -- hamburger button, hide search/profile details on mobile
- `client/src/pages/ProfilePage.tsx` -- extract inline grid to CSS class
- `client/src/pages/PaymentsPage.tsx` -- extract inline styles, add mobile class
- `client/src/pages/InvoicesPage.module.css` -- responsive `.formRow`
- `client/src/components/LineItemsEditor.tsx` + `.module.css` -- mobile card layout
- `client/src/components/ui/Modal.module.css` -- full-screen on mobile
- `client/src/components/FloatingAssistant.module.css` -- mobile sizing
- `client/src/components/DataTable.module.css` -- mobile overflow handling

