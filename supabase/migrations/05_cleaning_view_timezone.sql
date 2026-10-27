-- ─────────────────────────────────────────────────────────────────────────────
-- supabase/migrations/05_cleaning_view_timezone.sql
--
-- Replaces v_autoclave_cleaning_status view so that "today" is calculated
-- in the laboratory's timezone (Asia/Kolkata), preventing false OVERDUE or
-- SCHEDULED statuses due to UTC differences.
--
-- Idempotent: CREATE OR REPLACE VIEW
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.v_autoclave_cleaning_status AS
SELECT
  acs.*,
  CASE
    WHEN acs.status = 'COMPLETED'
      THEN 'COMPLETED'
    WHEN acs.scheduled_date < (timezone('Asia/Kolkata', now()))::date
      THEN 'OVERDUE'
    ELSE 'SCHEDULED'
  END AS status_display
FROM public.autoclave_cleaning_schedule acs;
