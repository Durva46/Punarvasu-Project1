-- ─────────────────────────────────────────────────────────────────────────────
-- supabase/migrations/01_helpers.sql
--
-- Helper functions used by RLS policies and triggers.
-- Run this FIRST, before any other migration.
-- Idempotent: uses CREATE OR REPLACE.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── set_updated_at() ─────────────────────────────────────────────────────────
-- Trigger function: automatically sets updated_at = now() on every UPDATE.
-- Attach to any table with:
--   CREATE TRIGGER trg_set_updated_at
--     BEFORE UPDATE ON <table>
--     FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- ── current_user_role() ──────────────────────────────────────────────────────
-- Returns the role text from the profiles table for the currently
-- authenticated Supabase user (auth.uid()).
-- Returns NULL if no profile exists (unauthenticated or no profile row).

CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role
  FROM   public.profiles
  WHERE  id = auth.uid()
    AND  active = true
  LIMIT  1;
$$;


-- ── has_role(variadic roles text[]) ─────────────────────────────────────────
-- Returns TRUE if the current user has any of the supplied roles.
-- Usage in RLS policies:  has_role('admin', 'analyst')

CREATE OR REPLACE FUNCTION has_role(VARIADIC roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT current_user_role() = ANY(roles);
$$;


-- ── auto_create_profile() ────────────────────────────────────────────────────
-- Trigger on auth.users: creates a matching profiles row when a new Supabase
-- Auth user signs up. The profile starts as role='viewer', active=true.

CREATE OR REPLACE FUNCTION auto_create_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'viewer',
    true
  )
  ON CONFLICT (id) DO NOTHING;  -- idempotent
  RETURN NEW;
END;
$$;

-- Attach auto_create_profile to auth.users (runs after every new sign-up)
-- NOTE: This trigger is on the auth schema which is managed by Supabase.
-- Run this in the Supabase SQL Editor (not via CLI migration) if the
-- auth schema is read-only in your project tier.
DROP TRIGGER IF EXISTS trg_auto_create_profile ON auth.users;
CREATE TRIGGER trg_auto_create_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_profile();


-- ── updated_at triggers on all editable tables ───────────────────────────────
-- Create one trigger per table that has an updated_at column.

DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'profiles', 'app_settings', 'reports', 'samples',
    'media_master', 'media_formulas', 'control_config',
    'stock_opening_balances', 'media_preparation_records',
    'autoclave_equipment', 'load_types', 'autoclave_log_entries',
    'autoclave_cleaning_schedule'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_set_updated_at ON public.%I;
       CREATE TRIGGER trg_set_updated_at
         BEFORE UPDATE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION set_updated_at();',
      tbl, tbl
    );
  END LOOP;
END;
$$;
