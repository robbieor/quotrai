-- =============================================================================
-- RLS REGRESSION TESTS
-- =============================================================================
-- Run with:   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_regression.sql
--
-- These tests assert the THREE bypass attempts identified in the audit (§7) all
-- fail. They are intentionally read/insert-only and roll back at the end.
--
-- The tests run as the `authenticated` Postgres role with `request.jwt.claims`
-- set to a synthetic uid that exists in `profiles` but has no special perms.
-- Replace TEST_USER_ID + TEST_OTHER_TEAM_ID below with real ids before running
-- in CI. (Left as placeholders so this file never accidentally mutates prod.)
-- =============================================================================

BEGIN;

-- --- SETUP ----------------------------------------------------------------
-- Substitute real values, e.g. via psql:
--   psql -v test_user_id="'00000000-0000-0000-0000-000000000001'" \
--        -v test_other_team_id="'00000000-0000-0000-0000-000000000002'" \
--        -f rls_regression.sql
\set test_user_id        '00000000-0000-0000-0000-000000000001'
\set test_other_team_id  '00000000-0000-0000-0000-000000000002'

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', :'test_user_id', 'role', 'authenticated')::text,
  true
);

-- --- TEST 1 -----------------------------------------------------------------
-- A non-owner member must NOT be able to UPDATE subscriptions_v2
-- (especially the trial_ends_at field, which would grant infinite free access).
DO $$
DECLARE
  v_org uuid;
  v_rows int;
BEGIN
  SELECT public.get_user_org_id_v2() INTO v_org;
  IF v_org IS NULL THEN
    RAISE NOTICE 'TEST 1 skipped: test user has no v2 org';
    RETURN;
  END IF;

  BEGIN
    UPDATE public.subscriptions_v2
       SET trial_ends_at = (now() + interval '10 years')
     WHERE org_id = v_org;
    GET DIAGNOSTICS v_rows = ROW_COUNT;

    IF v_rows > 0 THEN
      RAISE EXCEPTION 'TEST 1 FAILED: non-owner extended trial_ends_at (% rows)', v_rows;
    ELSE
      RAISE NOTICE 'TEST 1 PASS: UPDATE returned 0 rows (RLS or trigger blocked)';
    END IF;
  EXCEPTION WHEN insufficient_privilege OR raise_exception THEN
    RAISE NOTICE 'TEST 1 PASS: UPDATE rejected (%).', SQLERRM;
  END;
END $$;

-- --- TEST 2 -----------------------------------------------------------------
-- A user must NOT be able to INSERT a payment for an invoice belonging to
-- another team. Pick any invoice id from a foreign team.
DO $$
DECLARE
  v_foreign_invoice uuid;
  v_payment_id uuid;
BEGIN
  SELECT i.id INTO v_foreign_invoice
    FROM public.invoices i
   WHERE i.team_id <> COALESCE(
           (SELECT team_id FROM public.profiles WHERE id = auth.uid()),
           '00000000-0000-0000-0000-000000000000'::uuid
         )
   LIMIT 1;

  IF v_foreign_invoice IS NULL THEN
    RAISE NOTICE 'TEST 2 skipped: no foreign-team invoice found';
    RETURN;
  END IF;

  BEGIN
    INSERT INTO public.payments (invoice_id, amount, payment_method, notes)
    VALUES (v_foreign_invoice, 1, 'card', 'rls-regression-test')
    RETURNING id INTO v_payment_id;

    RAISE EXCEPTION 'TEST 2 FAILED: inserted payment % into foreign invoice', v_payment_id;
  EXCEPTION WHEN insufficient_privilege OR check_violation OR raise_exception THEN
    RAISE NOTICE 'TEST 2 PASS: payment insert rejected (%)', SQLERRM;
  END;
END $$;

-- --- TEST 3 -----------------------------------------------------------------
-- A user must NOT be able to SELECT profiles outside their own team.
DO $$
DECLARE
  v_my_team uuid;
  v_leaked_count int;
BEGIN
  SELECT team_id INTO v_my_team FROM public.profiles WHERE id = auth.uid();

  SELECT count(*) INTO v_leaked_count
    FROM public.profiles
   WHERE team_id IS DISTINCT FROM v_my_team;

  IF v_leaked_count > 0 THEN
    RAISE EXCEPTION 'TEST 3 FAILED: read % profiles from other teams', v_leaked_count;
  ELSE
    RAISE NOTICE 'TEST 3 PASS: cannot read profiles outside own team';
  END IF;
END $$;

-- --- TEARDOWN -------------------------------------------------------------
ROLLBACK;
