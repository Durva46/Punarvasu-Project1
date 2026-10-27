-- ─────────────────────────────────────────────────────────────────────────────
-- supabase/migrations/03_verification_trigger.sql
--
-- Database-level guard: only verifier or admin may change the verification
-- fields on autoclave_log_entries.
--
-- Verification fields:
--   verification_status, verified_by_id, verified_at,
--   actual_temperature_c, actual_pressure_value, actual_pressure_unit,
--   actual_start_time, actual_end_time
--
-- The API layer (permissions.ts) is the first line of defence.
-- This trigger is the second line — it fires even if the service role
-- is used directly (e.g. from the Supabase SQL Editor or a script).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION guard_verification_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  caller_role TEXT;
BEGIN
  -- Determine the role of the caller
  -- auth.uid() is null when called as service role; service role is trusted.
  IF auth.uid() IS NULL THEN
    RETURN NEW;  -- service role bypass
  END IF;

  caller_role := current_user_role();

  -- Check whether any verification field is being changed
  IF (
    NEW.verification_status  IS DISTINCT FROM OLD.verification_status  OR
    NEW.verified_by_id       IS DISTINCT FROM OLD.verified_by_id       OR
    NEW.verified_at          IS DISTINCT FROM OLD.verified_at           OR
    NEW.actual_temperature_c IS DISTINCT FROM OLD.actual_temperature_c  OR
    NEW.actual_pressure_value IS DISTINCT FROM OLD.actual_pressure_value OR
    NEW.actual_pressure_unit IS DISTINCT FROM OLD.actual_pressure_unit  OR
    NEW.actual_start_time    IS DISTINCT FROM OLD.actual_start_time     OR
    NEW.actual_end_time      IS DISTINCT FROM OLD.actual_end_time
  ) THEN
    IF caller_role NOT IN ('admin', 'verifier') THEN
      RAISE EXCEPTION
        'INSUFFICIENT_ROLE: Only admin or verifier may change verification fields. Current role: %',
        COALESCE(caller_role, 'unknown')
        USING ERRCODE = '42501';  -- insufficient_privilege
    END IF;
  END IF;

  -- Also enforce: VERIFIED entries cannot be modified at all unless
  -- the caller is admin (admin must reopen to PENDING_VERIFICATION first)
  IF OLD.verification_status = 'VERIFIED' THEN
    IF caller_role NOT IN ('admin', 'verifier') THEN
      RAISE EXCEPTION
        'VERIFIED_IMMUTABLE: VERIFIED entries cannot be edited. An admin or verifier must change the status first.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Attach to autoclave_log_entries
DROP TRIGGER IF EXISTS trg_guard_verification_fields ON public.autoclave_log_entries;
CREATE TRIGGER trg_guard_verification_fields
  BEFORE UPDATE ON public.autoclave_log_entries
  FOR EACH ROW
  EXECUTE FUNCTION guard_verification_fields();


-- ── CHECK constraint: VERIFIED requires actual readings and verified_by ───────
-- This is a declarative constraint — the trigger above enforces the role,
-- this constraint enforces data completeness.
-- Prisma cannot add a multi-column CHECK, so we add it here.

ALTER TABLE public.autoclave_log_entries
  DROP CONSTRAINT IF EXISTS chk_verified_completeness;

ALTER TABLE public.autoclave_log_entries
  ADD CONSTRAINT chk_verified_completeness CHECK (
    verification_status <> 'VERIFIED'
    OR (
      verified_by_id       IS NOT NULL AND
      verified_at          IS NOT NULL AND
      actual_temperature_c  IS NOT NULL AND
      actual_pressure_value IS NOT NULL AND
      actual_start_time    IS NOT NULL AND
      actual_end_time      IS NOT NULL
    )
  );


-- ── CHECK constraint: autoclave_entry_sources — at least one FK non-null ─────
ALTER TABLE public.autoclave_entry_sources
  DROP CONSTRAINT IF EXISTS chk_source_has_one_fk;

ALTER TABLE public.autoclave_entry_sources
  ADD CONSTRAINT chk_source_has_one_fk CHECK (
    sample_id IS NOT NULL OR media_prep_record_id IS NOT NULL
  );


-- ── CHECK constraints: autoclave_cleaning_schedule completeness ───────────────
ALTER TABLE public.autoclave_cleaning_schedule
  DROP CONSTRAINT IF EXISTS chk_cleaning_completed;

ALTER TABLE public.autoclave_cleaning_schedule
  ADD CONSTRAINT chk_cleaning_completed CHECK (
    status <> 'COMPLETED'
    OR (actual_date IS NOT NULL AND done_by_id IS NOT NULL)
  );


-- ── CHECK constraint: stock_opening_balances — balance >= 0 ─────────────────
ALTER TABLE public.stock_opening_balances
  DROP CONSTRAINT IF EXISTS chk_opening_balance_nonneg;

ALTER TABLE public.stock_opening_balances
  ADD CONSTRAINT chk_opening_balance_nonneg CHECK (
    opening_balance_gm >= 0
  );
