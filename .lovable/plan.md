
## Immediate Fix Plan: Signup still fails because `profiles.team_id` is being updated after insert

### What I found
The previous fix is already live, so the old `subscription_tier = 'active'` bug is no longer the current blocker.

The new blocker is confirmed in the auth logs:

```text
500: Database error saving new user
ERROR: Cannot change team_id
```

And the database currently has:

- `public.handle_new_user()` inserting a profile first, then running:
  ```sql
  UPDATE public.profiles
  SET team_id = new_team_id
  WHERE id = NEW.id;
  ```
- a `prevent_team_id_change_trigger` on `public.profiles` that raises:
  ```sql
  Cannot change team_id
  ```

So signup now fails because the trigger blocks the `UPDATE profiles SET team_id = ...` inside `handle_new_user()`.

### Correct fix
Do **not** weaken or remove the protection trigger.

Instead, update `handle_new_user()` so it:

1. creates the team first
2. inserts the profile with `team_id` already set in the initial `INSERT`
3. inserts the owner membership
4. never updates `profiles.team_id` afterward

That preserves the security rule and removes the signup failure.

### Migration to apply
Replace `handle_new_user()` with this version:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_team_id uuid;
BEGIN
  INSERT INTO public.teams (name, subscription_tier, trial_ends_at, is_trial)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Team'),
    'pro',
    now() + interval '30 days',
    true
  )
  RETURNING id INTO new_team_id;

  INSERT INTO public.profiles (id, team_id, full_name, email)
  VALUES (
    NEW.id,
    new_team_id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );

  INSERT INTO public.team_memberships (team_id, user_id, role)
  VALUES (new_team_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$;
```

### Why this is the right fix
- keeps `team_id` immutable after creation
- avoids fighting the `prevent_team_id_change` trigger
- keeps the 30-day Pro trial behavior
- avoids race conditions
- requires no frontend changes

### Files involved
- `supabase/migrations/...` — new migration redefining `public.handle_new_user()`
- no changes needed in:
  - `src/pages/Signup.tsx`
  - `src/hooks/useAuth.ts`

### Verification after applying
1. Create a brand-new account from the signup page
2. Confirm signup completes without “Database error saving new user”
3. Confirm a `team`, `profile`, and `team_membership` are created together
4. Recheck auth logs to ensure `/signup` returns 200/expected success flow

### Not recommended
Do **not** solve this by removing or loosening `prevent_team_id_change_trigger`. That trigger is protecting tenant integrity; the signup flow should respect it rather than bypass it.
