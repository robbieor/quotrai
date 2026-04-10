

# Add Confirmation Dialogs to Quote Status Changes

## Problem
Quote Q-0001 was marked "Accepted" without the user intentionally doing so. The "Mark as Accepted" and "Declined" buttons in QuoteDetailSheet execute immediately with no confirmation, making accidental status changes easy.

## Fix

### 1. Add confirmation dialog to status change buttons
In `QuoteDetailSheet.tsx`, wrap the "Mark as Sent", "Mark as Accepted", and "Declined" buttons with a confirmation dialog (using the existing `AlertDialog` pattern from `DeleteCertificateDialog`).

Each click opens a dialog: *"Are you sure you want to mark Q-0001 as Accepted? This will notify the team and enable conversion to a job or invoice."*

### 2. Add confirmation to Convert actions
The "Convert to Job" and "Convert to Invoice" buttons also change state irreversibly — add the same confirmation pattern.

### 3. Reset Q-0001 status (optional)
Run a migration to reset Q-0001 back to "draft" if desired, or leave it for manual correction via the UI.

## Files changed

| File | Change |
|------|--------|
| `src/components/quotes/QuoteDetailSheet.tsx` | Add `AlertDialog` confirmation before `onUpdateStatus` calls |
| `src/components/quotes/QuoteStatusConfirmDialog.tsx` | New reusable confirmation component |

## Technical detail
- Reuse the `AlertDialog` component already in the design system
- Store pending action in local state (`pendingStatus`), show dialog, execute on confirm
- No database or backend changes needed

