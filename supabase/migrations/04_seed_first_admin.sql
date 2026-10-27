-- ─────────────────────────────────────────────────────────────────────────────
-- supabase/migrations/04_seed_first_admin.sql
--
-- !! THIS FILE IS NOT AUTO-RUN !!
-- Copy the relevant snippet into the Supabase SQL Editor MANUALLY,
-- after you have created your first user via Supabase Auth.
-- ─────────────────────────────────────────────────────────────────────────────

-- STEP 1 ─ Find your user UUID
-- Go to: Supabase Dashboard → Authentication → Users
-- Copy the UUID of your account (looks like: a1b2c3d4-e5f6-...)

-- STEP 2 ─ Paste and run this SQL in Supabase SQL Editor
--   (replace the UUID below with your real one)

/*

UPDATE public.profiles
SET
  role   = 'admin',
  active = true
WHERE id = 'YOUR-USER-UUID-HERE';

-- Verify:
SELECT id, full_name, role, active FROM public.profiles;

*/


-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICATION SCRIPT
-- Run this in the Supabase SQL Editor to confirm the Phase 2 setup is correct.
-- ─────────────────────────────────────────────────────────────────────────────

/*

-- 1. All tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'profiles','app_settings','reports','samples',
    'media_master','media_formulas','control_config',
    'stock_opening_balances','media_preparation_records','refill_log',
    'alerts','autoclave_settings','autoclave_equipment','load_types',
    'autoclave_log_entries','autoclave_entry_sources',
    'autoclave_cleaning_schedule','audit_log','export_log'
  )
ORDER BY table_name;
-- Expected: 19 rows


-- 2. RLS is enabled on every table
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles','app_settings','reports','samples',
    'media_master','media_formulas','control_config',
    'stock_opening_balances','media_preparation_records','refill_log',
    'alerts','autoclave_settings','autoclave_equipment','load_types',
    'autoclave_log_entries','autoclave_entry_sources',
    'autoclave_cleaning_schedule','audit_log','export_log'
  )
ORDER BY tablename;
-- Expected: rowsecurity = true for all 19


-- 3. Seed counts
SELECT 'media_master'      AS tbl, COUNT(*) FROM public.media_master
UNION ALL
SELECT 'media_formulas',           COUNT(*) FROM public.media_formulas
UNION ALL
SELECT 'load_types',               COUNT(*) FROM public.load_types
UNION ALL
SELECT 'autoclave_equipment',      COUNT(*) FROM public.autoclave_equipment;
-- Expected: 21 / 5 / 5 / 1


-- 4. Unique constraints exist
SELECT conname, contype, conrelid::regclass AS table_name
FROM pg_constraint
WHERE contype = 'u'
  AND conrelid::regclass::text IN (
    'media_master','media_formulas','load_types',
    'autoclave_settings','autoclave_log_entries',
    'autoclave_cleaning_schedule','media_preparation_records'
  )
ORDER BY conrelid::regclass, conname;


-- 5. VERIFIED CHECK constraint rejects incomplete row
--    (runs inside a transaction that rolls back — safe to run anytime)
BEGIN;

-- This should FAIL with a check constraint violation
INSERT INTO public.autoclave_log_entries (
  id, report_id, reporting_month, log_date, load_type_id, load_description,
  autoclave_start_time, sterilization_start_time, temperature_c,
  pressure_value, pressure_unit, end_time, verification_status,
  done_by_id, created_by_id
) VALUES (
  'test-id-000', 'fake-report', '2025-10-01', '2025-10-01',
  (SELECT id FROM public.load_types LIMIT 1),
  'Test entry',
  '11:00', '11:10', 121, 15, 'LBS', '11:25',
  'VERIFIED',                          -- <-- VERIFIED but no actual readings
  (SELECT id FROM public.profiles LIMIT 1),
  (SELECT id FROM public.profiles LIMIT 1)
);

-- You should see: ERROR: new row violates check constraint "chk_verified_completeness"
ROLLBACK;

*/
