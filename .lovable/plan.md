

## Onboarding Flow Redesign — "Finish Later" + Save Fix + Mobile Polish

### Problems Found

1. **No "finish later" option** — The modal blocks interaction with `onInteractOutside={(e) => e.preventDefault()}` and `onEscapeKeyDown={(e) => e.preventDefault()}`. The close button is hidden via `[&>button]:hidden`. Users are trapped.

2. **Save doesn't trigger** — Profile data only saves at the step 4→5 transition (`saveProfileIfNeeded` on line 198). If a user fills steps 1-3 and wants to leave, nothing is persisted. The `handleComplete` also calls `saveProfileIfNeeded` but it short-circuits if `profileSaved` is already true, and comms prefs only save on final "Get Started" click.

3. **Mobile padding/layout issues** — The dialog uses `max-w-2xl` and `p-6` with no mobile-specific padding. The step progress bar with 6 labels cramps on 402px viewport. Card headers add redundant icon + title + description on every step, eating vertical space on mobile.

4. **Step 5 (Prices) breaks if profile not saved** — `teamId` is only set after `saveProfileIfNeeded` runs. If user skips to step 5 without triggering save, `teamId` is null and the templates step renders nothing (guarded by `step === 5 && teamId`).

### Solution

**A. Add "Finish Later" with progressive save**

- Add a "Finish Later" link in the modal header (all steps)
- When clicked: save whatever data has been entered so far to the profile (partial save), set `onboarding_completed = false` (already the default), close modal
- Store `onboarding_step` in the profile so when they return, they resume where they left off
- On next login, the dashboard detects incomplete onboarding and re-opens the modal at the saved step

**B. Fix save triggers**

- Save profile data on every "Continue" click (not just step 4→5). Use a debounced/batched approach — update profile with whatever fields have values
- Remove the `profileSaved` short-circuit flag; always upsert current data
- Save `teamId` eagerly on component mount by reading from profile (it's created during signup)

**C. Mobile layout fixes**

- Reduce dialog padding from `p-6` to `p-4 sm:p-6`
- Collapse step labels to dots-only on mobile (show labels on sm+)
- Remove redundant Card wrappers inside the dialog (the dialog IS the card)
- Ensure buttons are full-width on mobile
- Add `pb-safe` for iOS safe area

**D. Database migration**

Add `onboarding_step` column to profiles table to track resume position:
```sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_step integer DEFAULT 1;
```

### Files Modified

| File | Change |
|------|--------|
| `src/components/onboarding/OnboardingModal.tsx` | Add "Finish Later" button, save on every Continue, load teamId on mount, resume from saved step, mobile padding fixes, simplify card wrappers |
| `src/pages/Dashboard.tsx` | Pass saved step to OnboardingModal |
| `src/hooks/useOnboarding.ts` | Return `onboarding_step` alongside `onboarding_completed` |
| Migration | Add `onboarding_step` column to profiles |

### Detailed Changes to OnboardingModal.tsx

1. **Header area**: Replace trapped modal with dismissible one. Add "Finish later" ghost button top-right. Remove `onInteractOutside` and `onEscapeKeyDown` prevention.

2. **Mount**: Fetch `teamId` from profile immediately (it exists from signup). Remove dependency on `saveProfileIfNeeded` for `teamId`.

3. **handleNext**: Save profile fields on every step transition (not just step 4). This is a single `.update()` call with current form state.

4. **handleFinishLater**: New function — saves current data + `onboarding_step` to profile, closes modal without marking `onboarding_completed = true`.

5. **Step progress bar**: On mobile (< sm), show only colored dots. Show text labels on sm+.

6. **Padding**: `p-4 sm:p-6` on dialog content. Step cards use `px-0` already (good). Button row gets `gap-2 flex-col sm:flex-row` on mobile.

7. **Step 5 guard**: Remove `teamId &&` guard since teamId is loaded on mount. Show loading state if teamId is still being fetched.

