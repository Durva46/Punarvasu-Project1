# Production Deployment Checklist

**PETLAD MAHAL AROGYA MANDAL PHARMACY — Laboratory Management Software (LabFlow)**

This guide provides step-by-step instructions for deploying LabFlow to production on Supabase and Vercel.

---

## 1. Supabase Project Setup (Production)

### A. Create Project
1. Log into your [Supabase Dashboard](https://supabase.com/dashboard).
2. Click **New Project**.
3. Organization: Select your lab organization.
4. Name: `labflow-production`.
5. Database Password: Generate a secure password and save it securely in your password manager.
6. Region: Choose `ap-south-1 (Mumbai)` for lowest latency to Gujarat, India.
7. Plan: Pro or Team (recommended for daily backups and point-in-time recovery).

### B. Configure Authentication
1. Go to **Authentication** $\rightarrow$ **URL Configuration**.
2. **Site URL**: Enter your production frontend Vercel URL (e.g. `https://labflow.vercel.app`).
3. **Redirect URLs**: Add `https://labflow.vercel.app/**` and `http://localhost:5173/**` for testing.
4. Set **Email Confirmation** as per your laboratory IT policy.

### C. Create Private Storage Buckets
1. In the left menu, click **Storage**.
2. Click **New Bucket**:
   - Name: `monthly-reports`
   - Public: **Disabled** (Private bucket)
3. Click **New Bucket**:
   - Name: `exports`
   - Public: **Disabled** (Private bucket)

### D. Apply Database Migrations (In Order)
Open the **SQL Editor** in Supabase and run the SQL migration files located in `supabase/migrations/` sequentially:

1. `supabase/migrations/01_helpers.sql` — Triggers, update timestamps, and helper functions.
2. `supabase/migrations/02_rls_policies.sql` — Row Level Security (RLS) on all 19 tables.
3. `supabase/migrations/03_verification_trigger.sql` — Automated verification status integrity triggers.
4. `supabase/migrations/04_seed_first_admin.sql` — Initial admin promotion helper.
5. `supabase/migrations/05_cleaning_view_timezone.sql` — `v_autoclave_cleaning_status` view with `Asia/Kolkata` calculation.

---

## 2. Vercel Backend & Frontend Deployment

### A. Deploy Backend API
1. In the [Vercel Dashboard](https://vercel.com), click **Add New** $\rightarrow$ **Project**.
2. Connect your Git repository.
3. Root Directory: `backend`
4. Framework Preset: **Other**
5. Build Command: `npm run build`
6. Output Directory: `dist`
7. Environment Variables:
   - `NODE_ENV`: `production`
   - `DATABASE_URL`: Your Supabase pooler connection string (Port 6543)
   - `DIRECT_URL`: Your Supabase direct connection string (Port 5432)
   - `SUPABASE_URL`: `https://<your-project-ref>.supabase.co`
   - `SUPABASE_ANON_KEY`: `<your-supabase-anon-key>`
   - `SUPABASE_SERVICE_ROLE_KEY`: `<your-supabase-service-role-key>`
   - `APP_BASE_URL`: `https://<frontend-vercel-domain>`
   - `CORS_ORIGINS`: `https://<frontend-vercel-domain>`
   - `TRUST_PROXY`: `1`
8. Click **Deploy**. Note down the assigned backend URL (e.g., `https://labflow-backend.vercel.app`).

### B. Deploy Frontend
1. Click **Add New** $\rightarrow$ **Project**.
2. Connect the same repository.
3. Root Directory: `frontend`
4. Framework Preset: **Vite**
5. Environment Variables:
   - `VITE_API_BASE_URL`: `https://labflow-backend.vercel.app` (your backend URL)
6. Click **Deploy**.

---

## 3. First-Time System Data Setup

1. **Create the First Admin User**:
   - Create a user in Supabase Auth via the dashboard or login page.
   - Run the admin promotion script in Supabase SQL editor:
     ```sql
     SELECT public.promote_user_to_admin('admin@yourpharmacy.com');
     ```
2. **Seed Initial Master Records**:
   - Navigate to `/settings` as Admin.
   - Verify Media Master items (Soybean Casein Digest Broth, Mac Conkey Broth, Peptone Water, etc.).
   - Enter `quantityPerTube` values for all media (e.g. 2.70 gm for SCDB).
3. **Verify Equipment Configuration**:
   - Go to `/settings/autoclave`.
   - Confirm equipment numbers:
     - **Format No.**: `QC/M/023/F/01`
     - **Ref. SOP No.**: `PM/QC/M/023`
     - **Equipment No.**: `PM/QC/M/01`
   - Verify defaults: Start `11:00 AM`, Sterilization `11:10 AM`, Temp `121 °C`, Pressure `15 LBS`, Duration `15 min`.
   - Verify cleaning schedule rules: Anchor `1`, Second `7`, Interval `7`.

---

## 4. Smoke Test Script (On Production)

1. Log in with your Admin credentials.
2. Go to **Excel Upload** (`/imports`) and upload a test monthly file.
3. Verify sample counts on **Sample Analysis** and **Daily Count** tabs.
4. Go to **Media Preparation** (`/media`):
   - Enter opening balance for initial date.
   - Verify formula tube counts ($S, W, N$).
5. Go to **Autoclave Log Book** (`/autoclave`):
   - Click **Generate / Refresh Log Entries**.
   - Verify exactly 1 entry per date is generated with default values.
   - Click **Generate / Refresh Cleaning Schedule**. Confirm dates: 1, 7, 14, 21, 28.
   - Click **Mark Complete** on a past cleaning date.
6. Go to **Final Review & Downloads** (`/reports`):
   - Verify all 6 checklist items display live status.
   - Click **Export Excel** and **Export PDF** for all three cards.
   - Open downloaded files and verify laboratory headers and signature lines.
7. Test **Print View**: Verify page breaks and repeated table headers.

---

## 5. Cleaning Up Test Data (Safe Production Script)

To remove test data created during smoke testing, run this SQL in Supabase SQL Editor:

```sql
-- ⚠️ WARNING: Run ONLY to remove test data. Never run in active production with real records.
BEGIN;

-- 1. Remove export logs
DELETE FROM public.export_log WHERE report_id IN (SELECT id FROM public.reports WHERE file_name LIKE '%test%');

-- 2. Remove autoclave entries
DELETE FROM public.autoclave_entry_sources WHERE report_id IN (SELECT id FROM public.reports WHERE file_name LIKE '%test%');
DELETE FROM public.autoclave_log_entries WHERE report_id IN (SELECT id FROM public.reports WHERE file_name LIKE '%test%');

-- 3. Remove media preparation records
DELETE FROM public.media_preparation_records WHERE report_id IN (SELECT id FROM public.reports WHERE file_name LIKE '%test%');

-- 4. Remove test samples & report
DELETE FROM public.samples WHERE report_id IN (SELECT id FROM public.reports WHERE file_name LIKE '%test%');
DELETE FROM public.reports WHERE file_name LIKE '%test%';

COMMIT;
```

---

## 6. Backups & Rollback Strategy

1. **Automated Backups**:
   - Supabase Pro plan automatically creates daily database backups with point-in-time recovery (PITR) up to 7 days.
   - Inspect backups under **Database** $\rightarrow$ **Backups** in Supabase dashboard.
2. **Vercel Rollback**:
   - In the Vercel dashboard, open the project $\rightarrow$ **Deployments**.
   - Select the previous stable deployment and click **Rollback**. Instant zero-downtime rollback.
3. **Database Migration Rollback Policy**:
   - Never edit or delete previously applied database migrations.
   - Always apply forward-fixing migrations.
