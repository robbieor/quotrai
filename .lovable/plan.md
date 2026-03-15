

# Make AI Audit History Accessible

## Problem
The AI Audit History page (`/ai-audit`) exists as a route but has no navigation entry — users can't discover or reach it.

## Plan

**Add it in two places:**

1. **Foreman AI page (`George.tsx`)** — Add a small "Activity History" button (clock/history icon) in the header area of the Foreman AI workspace. This is the most intuitive location since it's the audit trail for AI actions performed in that very interface.

2. **Sidebar (`AppSidebar.tsx`)** — Add an "AI Activity" sub-item under the existing Foreman AI nav entry, so it's always one click away from the main navigation.

**Files changed:**
- `src/components/layout/AppSidebar.tsx` — add nav link to `/ai-audit`
- `src/pages/George.tsx` — add a header button linking to `/ai-audit`

