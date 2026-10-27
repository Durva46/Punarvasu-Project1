-- ─────────────────────────────────────────────────────────────────────────────
-- supabase/migrations/02_rls_policies.sql
--
-- Enable Row-Level Security on every table and create policies.
-- Run AFTER 01_helpers.sql.
-- Idempotent: uses DROP POLICY IF EXISTS before CREATE POLICY.
--
-- Role matrix (from AGENTS.md §E):
--   SELECT:    any authenticated active user
--   INSERT/UPDATE (data tables): admin, analyst
--   Verification fields:         admin, verifier (enforced by trigger in 03_)
--   Settings, masters:           admin only
--   Cleaning completion:         admin, analyst, verifier
--   audit_log / export_log:      INSERT via triggers only; SELECT admin+verifier
--   profiles:                    read all active; update own full_name; admin→role/active
-- ─────────────────────────────────────────────────────────────────────────────

-- Helper macro: enable RLS and recreate a policy idempotently
-- (we do it inline per table below for clarity)


-- ── profiles ─────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select"     ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all"  ON public.profiles;

-- Any authenticated active user can read all active profiles
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (active = true);

-- Users can update only their own full_name (no role/active change)
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role  = (SELECT role  FROM public.profiles WHERE id = auth.uid())
    AND active = (SELECT active FROM public.profiles WHERE id = auth.uid())
  );

-- Admin can do everything on profiles
CREATE POLICY "profiles_admin_all" ON public.profiles
  FOR ALL TO authenticated
  USING (has_role('admin'));


-- ── app_settings ──────────────────────────────────────────────────────────────
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_settings_select" ON public.app_settings;
DROP POLICY IF EXISTS "app_settings_write"  ON public.app_settings;

CREATE POLICY "app_settings_select" ON public.app_settings
  FOR SELECT TO authenticated
  USING (has_role('admin', 'analyst', 'verifier', 'viewer'));

CREATE POLICY "app_settings_write" ON public.app_settings
  FOR ALL TO authenticated
  USING (has_role('admin'))
  WITH CHECK (has_role('admin'));


-- ── reports ───────────────────────────────────────────────────────────────────
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_select" ON public.reports;
DROP POLICY IF EXISTS "reports_write"  ON public.reports;

CREATE POLICY "reports_select" ON public.reports
  FOR SELECT TO authenticated
  USING (current_user_role() IS NOT NULL);

CREATE POLICY "reports_write" ON public.reports
  FOR ALL TO authenticated
  USING (has_role('admin', 'analyst'))
  WITH CHECK (has_role('admin', 'analyst'));


-- ── samples ───────────────────────────────────────────────────────────────────
ALTER TABLE public.samples ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "samples_select" ON public.samples;
DROP POLICY IF EXISTS "samples_write"  ON public.samples;

CREATE POLICY "samples_select" ON public.samples
  FOR SELECT TO authenticated
  USING (current_user_role() IS NOT NULL);

CREATE POLICY "samples_write" ON public.samples
  FOR ALL TO authenticated
  USING (has_role('admin', 'analyst'))
  WITH CHECK (has_role('admin', 'analyst'));


-- ── media_master ──────────────────────────────────────────────────────────────
ALTER TABLE public.media_master ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "media_master_select" ON public.media_master;
DROP POLICY IF EXISTS "media_master_write"  ON public.media_master;

CREATE POLICY "media_master_select" ON public.media_master
  FOR SELECT TO authenticated
  USING (current_user_role() IS NOT NULL);

CREATE POLICY "media_master_write" ON public.media_master
  FOR ALL TO authenticated
  USING (has_role('admin'))
  WITH CHECK (has_role('admin'));


-- ── media_formulas ────────────────────────────────────────────────────────────
ALTER TABLE public.media_formulas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "media_formulas_select" ON public.media_formulas;
DROP POLICY IF EXISTS "media_formulas_write"  ON public.media_formulas;

CREATE POLICY "media_formulas_select" ON public.media_formulas
  FOR SELECT TO authenticated
  USING (current_user_role() IS NOT NULL);

CREATE POLICY "media_formulas_write" ON public.media_formulas
  FOR ALL TO authenticated
  USING (has_role('admin'))
  WITH CHECK (has_role('admin'));


-- ── control_config ────────────────────────────────────────────────────────────
ALTER TABLE public.control_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "control_config_select" ON public.control_config;
DROP POLICY IF EXISTS "control_config_write"  ON public.control_config;

CREATE POLICY "control_config_select" ON public.control_config
  FOR SELECT TO authenticated
  USING (current_user_role() IS NOT NULL);

CREATE POLICY "control_config_write" ON public.control_config
  FOR ALL TO authenticated
  USING (has_role('admin'))
  WITH CHECK (has_role('admin'));


-- ── stock_opening_balances ────────────────────────────────────────────────────
ALTER TABLE public.stock_opening_balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sob_select" ON public.stock_opening_balances;
DROP POLICY IF EXISTS "sob_write"  ON public.stock_opening_balances;

CREATE POLICY "sob_select" ON public.stock_opening_balances
  FOR SELECT TO authenticated
  USING (current_user_role() IS NOT NULL);

CREATE POLICY "sob_write" ON public.stock_opening_balances
  FOR ALL TO authenticated
  USING (has_role('admin', 'analyst'))
  WITH CHECK (has_role('admin', 'analyst'));


-- ── media_preparation_records ─────────────────────────────────────────────────
ALTER TABLE public.media_preparation_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mpr_select" ON public.media_preparation_records;
DROP POLICY IF EXISTS "mpr_write"  ON public.media_preparation_records;

CREATE POLICY "mpr_select" ON public.media_preparation_records
  FOR SELECT TO authenticated
  USING (current_user_role() IS NOT NULL);

CREATE POLICY "mpr_write" ON public.media_preparation_records
  FOR ALL TO authenticated
  USING (has_role('admin', 'analyst'))
  WITH CHECK (has_role('admin', 'analyst'));


-- ── refill_log ────────────────────────────────────────────────────────────────
ALTER TABLE public.refill_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "refill_log_select" ON public.refill_log;
DROP POLICY IF EXISTS "refill_log_write"  ON public.refill_log;

CREATE POLICY "refill_log_select" ON public.refill_log
  FOR SELECT TO authenticated
  USING (current_user_role() IS NOT NULL);

CREATE POLICY "refill_log_write" ON public.refill_log
  FOR INSERT TO authenticated
  WITH CHECK (has_role('admin', 'analyst'));


-- ── alerts ────────────────────────────────────────────────────────────────────
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alerts_select"  ON public.alerts;
DROP POLICY IF EXISTS "alerts_insert"  ON public.alerts;
DROP POLICY IF EXISTS "alerts_resolve" ON public.alerts;

CREATE POLICY "alerts_select" ON public.alerts
  FOR SELECT TO authenticated
  USING (current_user_role() IS NOT NULL);

CREATE POLICY "alerts_insert" ON public.alerts
  FOR INSERT TO authenticated
  WITH CHECK (has_role('admin', 'analyst'));

-- Only admin/analyst/verifier can resolve alerts
CREATE POLICY "alerts_resolve" ON public.alerts
  FOR UPDATE TO authenticated
  USING (has_role('admin', 'analyst', 'verifier'))
  WITH CHECK (has_role('admin', 'analyst', 'verifier'));


-- ── autoclave_settings ────────────────────────────────────────────────────────
ALTER TABLE public.autoclave_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "autoclave_settings_select" ON public.autoclave_settings;
DROP POLICY IF EXISTS "autoclave_settings_write"  ON public.autoclave_settings;

CREATE POLICY "autoclave_settings_select" ON public.autoclave_settings
  FOR SELECT TO authenticated
  USING (current_user_role() IS NOT NULL);

CREATE POLICY "autoclave_settings_write" ON public.autoclave_settings
  FOR ALL TO authenticated
  USING (has_role('admin'))
  WITH CHECK (has_role('admin'));


-- ── autoclave_equipment ───────────────────────────────────────────────────────
ALTER TABLE public.autoclave_equipment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "autoclave_equipment_select" ON public.autoclave_equipment;
DROP POLICY IF EXISTS "autoclave_equipment_write"  ON public.autoclave_equipment;

CREATE POLICY "autoclave_equipment_select" ON public.autoclave_equipment
  FOR SELECT TO authenticated
  USING (current_user_role() IS NOT NULL);

CREATE POLICY "autoclave_equipment_write" ON public.autoclave_equipment
  FOR ALL TO authenticated
  USING (has_role('admin'))
  WITH CHECK (has_role('admin'));


-- ── load_types ────────────────────────────────────────────────────────────────
ALTER TABLE public.load_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "load_types_select" ON public.load_types;
DROP POLICY IF EXISTS "load_types_write"  ON public.load_types;

CREATE POLICY "load_types_select" ON public.load_types
  FOR SELECT TO authenticated
  USING (current_user_role() IS NOT NULL);

CREATE POLICY "load_types_write" ON public.load_types
  FOR ALL TO authenticated
  USING (has_role('admin'))
  WITH CHECK (has_role('admin'));


-- ── autoclave_log_entries ─────────────────────────────────────────────────────
ALTER TABLE public.autoclave_log_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ale_select"            ON public.autoclave_log_entries;
DROP POLICY IF EXISTS "ale_write_analyst"     ON public.autoclave_log_entries;
DROP POLICY IF EXISTS "ale_write_verifier"    ON public.autoclave_log_entries;

CREATE POLICY "ale_select" ON public.autoclave_log_entries
  FOR SELECT TO authenticated
  USING (current_user_role() IS NOT NULL);

-- Admin and analyst can INSERT and UPDATE non-verification fields
CREATE POLICY "ale_write_analyst" ON public.autoclave_log_entries
  FOR ALL TO authenticated
  USING (has_role('admin', 'analyst'))
  WITH CHECK (has_role('admin', 'analyst'));

-- Verification field enforcement is done by the trigger in 03_verification_trigger.sql


-- ── autoclave_entry_sources ───────────────────────────────────────────────────
ALTER TABLE public.autoclave_entry_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "aes_select" ON public.autoclave_entry_sources;
DROP POLICY IF EXISTS "aes_write"  ON public.autoclave_entry_sources;

CREATE POLICY "aes_select" ON public.autoclave_entry_sources
  FOR SELECT TO authenticated
  USING (current_user_role() IS NOT NULL);

CREATE POLICY "aes_write" ON public.autoclave_entry_sources
  FOR ALL TO authenticated
  USING (has_role('admin', 'analyst'))
  WITH CHECK (has_role('admin', 'analyst'));


-- ── autoclave_cleaning_schedule ───────────────────────────────────────────────
ALTER TABLE public.autoclave_cleaning_schedule ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "acs_select" ON public.autoclave_cleaning_schedule;
DROP POLICY IF EXISTS "acs_write"  ON public.autoclave_cleaning_schedule;

CREATE POLICY "acs_select" ON public.autoclave_cleaning_schedule
  FOR SELECT TO authenticated
  USING (current_user_role() IS NOT NULL);

-- Admin, analyst, and verifier can complete cleaning records
CREATE POLICY "acs_write" ON public.autoclave_cleaning_schedule
  FOR ALL TO authenticated
  USING (has_role('admin', 'analyst', 'verifier'))
  WITH CHECK (has_role('admin', 'analyst', 'verifier'));


-- ── audit_log ─────────────────────────────────────────────────────────────────
-- INSERT only via server (service role bypasses RLS).
-- SELECT for admin and verifier. No UPDATE or DELETE — ever.
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_log_select" ON public.audit_log;
DROP POLICY IF EXISTS "audit_log_insert" ON public.audit_log;

CREATE POLICY "audit_log_select" ON public.audit_log
  FOR SELECT TO authenticated
  USING (has_role('admin', 'verifier'));

-- Service role bypasses RLS; this policy only protects direct client access
CREATE POLICY "audit_log_insert" ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (false);  -- block direct inserts; all writes go through service role


-- ── export_log ────────────────────────────────────────────────────────────────
ALTER TABLE public.export_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "export_log_select" ON public.export_log;
DROP POLICY IF EXISTS "export_log_insert" ON public.export_log;

CREATE POLICY "export_log_select" ON public.export_log
  FOR SELECT TO authenticated
  USING (has_role('admin', 'verifier'));

CREATE POLICY "export_log_insert" ON public.export_log
  FOR INSERT TO authenticated
  WITH CHECK (false);  -- all writes go through service role


-- ── v_autoclave_cleaning_status VIEW ─────────────────────────────────────────
-- Adds computed column status_display:
--   COMPLETED if status = 'COMPLETED'
--   OVERDUE    if scheduled_date < current_date and not completed
--   SCHEDULED  otherwise
-- (OVERDUE is never stored, always computed at query time)
CREATE OR REPLACE VIEW public.v_autoclave_cleaning_status AS
SELECT
  acs.*,
  CASE
    WHEN acs.status = 'COMPLETED'                          THEN 'COMPLETED'
    WHEN acs.scheduled_date < CURRENT_DATE                 THEN 'OVERDUE'
    ELSE 'SCHEDULED'
  END AS status_display
FROM public.autoclave_cleaning_schedule acs;
