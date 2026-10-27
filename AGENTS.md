# AGENTS.md — LabFlow Project Working Rules

> This file is the authoritative reference for every AI session working on this repo.
> Read it fully before writing a single line of code.

---

## 0. Project Identity

**PETLAD MAHAL AROGYA MANDAL PHARMACY — Manufacturing Unit Automation & Laboratory Management Software**

The software manages monthly sample registration, media preparation records, autoclave log books, and related lab workflows. Stages 3–7 are placeholders only ("To be provided").

---

## 1. Stack — Do Not Change Without Approval

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite (in `/frontend`) |
| Backend API | Express 4 + TypeScript + Node ≥ 20 (in `/backend`) |
| ORM | Prisma 6 (schema at `backend/prisma/schema.prisma`) |
| Database | Supabase (PostgreSQL via session-pooler `DATABASE_URL`) |
| Auth | Custom session-based auth (`backend/src/modules/auth`) |
| Validation | Zod (backend + frontend) |
| Excel parse/export | SheetJS (xlsx) for parsing; ExcelJS for generation |
| PDF export | pdfkit (no headless Chrome / Puppeteer — ever) |
| Testing | Vitest (backend + frontend) |
| Deployment | Vercel (backend as a long-running Express server, see `vercel.json`) |

---

## 2. Monorepo Layout

```
/
├── AGENTS.md                   ← THIS FILE
├── package.json                ← root scripts (dev, build, test)
├── vercel.json                 ← Vercel deployment config
├── .env.example                ← env variable template
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       ← single source of truth for DB schema
│   │   └── seed.ts             ← seed for demo data
│   └── src/
│       ├── app.ts              ← Express app factory
│       ├── index.ts            ← HTTP server entry
│       ├── config/env.ts       ← validated env (fail-fast)
│       ├── lib/                ← shared utilities (audit, errors, prisma, time, …)
│       ├── middleware/         ← auth, CSRF, rate-limit, validate, upload
│       └── modules/            ← feature modules (auth, autoclave, imports, media, …)
│           └── <module>/
│               ├── routes.ts   ← Express router
│               └── service.ts  ← business logic (if needed)
└── frontend/
    └── src/
        ├── App.tsx             ← routes
        ├── types.ts            ← shared API types (mirrors backend contracts)
        ├── lib/                ← api.ts, format.ts, download.ts, …
        ├── context/            ← AuthContext, PeriodContext
        ├── components/         ← ui/ and layout/
        └── pages/              ← one file per page/route
```

---

## 3. Absolute Rules

### 3.1 Never Break Existing Features
- Every existing route, page, table, and export must keep working.
- Adding a field to an existing API response is OK. Removing or renaming one is a breaking change — add the new field alongside the old one and migrate the frontend.

### 3.2 Business Logic Location
- **All business calculations live exclusively in the backend** (`/backend/src/modules/<module>/service.ts`).
- The frontend **only displays** what the backend returns. It never re-implements a formula, threshold check, or status derivation.
- This applies to: tube/plate counts, quantity used, balance, low-stock flags, autoclave end-time calculation, cleaning schedule, verification status transitions.

### 3.3 Security
- The backend reads `SESSION_SECRET`, `PASSWORD_PEPPER`, `DATABASE_URL`, `DIRECT_URL` from environment only — never from frontend code or the repo.
- The frontend uses only `VITE_API_BASE_URL` (points to the backend) and no database secrets.
- Every backend route starts with `requirePermission('<permission>')` before touching data.
- Input validated with Zod on every route before any DB query.
- All state-changing routes are audited via `recordAudit()`.

### 3.4 Database
- Schema changes go in `backend/prisma/schema.prisma` only.
- After schema edits: `npx prisma migrate dev --name <descriptive-name>` (dev) or `npx prisma migrate deploy` (prod/CI).
- Never use raw SQL for schema changes — always Prisma migrations.
- UUID-style PKs are Prisma `cuid()` (existing convention — keep it).
- Every table has `createdAt` and `updatedAt`. State-changing tables also have `createdById`/`updatedById` referencing `User`.

### 3.5 API Conventions
- Base prefix: `/api/v1/`
- All responses wrapped: `{ data: T }` (single) or `{ data: T[], meta: PaginationMeta }` (list).
- Errors: `{ error: { code, message, details?, requestId? } }` (see `backend/src/lib/errors.ts`).
- HTTP status codes: 200 GET/PATCH, 201 POST create, 400 validation, 401 unauth, 403 forbidden, 404 not found, 409 conflict, 422 business rule, 500 internal.
- PATCH is partial (only send changed fields).

### 3.6 Frontend Conventions
- One component per file, named export, file name = component name.
- State from the backend — never fabricate counts or statuses.
- Display `loading` state while fetching. Display `error` state on failure.
- Design: light background (`bg-surface`), white cards, subtle borders (`border-line`), blue/green accents. No decorative animations. Desktop-first, responsive. Reuse existing UI components from `frontend/src/components/ui/`.
- Date display: `DD-MM-YYYY`. Time display: 12-hour (`HH:MM AM/PM`). Use `formatDate`, `formatTime12h` from `frontend/src/lib/format.ts`.

### 3.7 Exports
- Excel: generated by ExcelJS in the backend, streamed as `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.
- PDF: generated by pdfkit in the backend, streamed as `application/pdf`.
- Every export is logged to `AuditLog` with `action: 'EXPORT_*'`, actor, and timestamp.
- Files never claim sterilization success. Unverified autoclave entries are labelled "Pending verification".

---

## 4. Workflow Steps (in order)

| Step | Page | Route | Status |
|------|------|--------|--------|
| 1 | Monthly Excel Upload | `/imports` | ✅ Built |
| 2 | Sample Analysis + Daily Count | `/imports` (tabs) | ✅ Built |
| 3 | Media Preparation | `/media` | 🔧 Step 1 corrections in progress |
| 4 | Autoclave Log Book | `/autoclave` | 🔧 Step 2 in progress |
| 5 | Final Review & Downloads | `/reports` | 🔧 Pending |
| — | LAF Log Book | `/stages/3` | ⛔ Disabled placeholder |
| — | B.O.D. Incubator – Bacteria | `/stages/4` | ⛔ Disabled placeholder |
| — | B.O.D. Incubator – Fungus | `/stages/5` | ⛔ Disabled placeholder |
| — | B.O.D. Incubator – Pathogen | `/stages/6` | ⛔ Disabled placeholder |
| — | Colony Counter Log Book | `/stages/7` | ⛔ Disabled placeholder |

---

## 5. Media Preparation — Formula Engine Rules

### 5.1 Variables (per date, from database)
- `S` = total samples on that date (from `Sample` table, filtered by `registrationDate`)
- `W` = samples where `sampleName` contains "water" (case-insensitive)
- `N` = `S − W`
- `PC` = Positive Control (configurable, default 1)
- `NC` = Negative Control (configurable, default 1)

### 5.2 Tube/Plate Formulas (stored in `MediaFormula` table, NOT hardcoded)

| Media | Formula |
|-------|---------|
| Soybean Casein Digest Broth | `T = S × 2` |
| Mac Conkey's Broth | `T = (S + 1 + 1 + 1) × 2` ← exactly as written, never simplified |
| Peptone Water | `T = S + 1 + 1` |
| Mac Conkey's Agar | `T = S + 1 + 1` |
| Eosine Methelene Blue Agar | `T = S + 1 + 1` |
| Mannitol Salt Agar | `T = S + 1 + 1` |
| Vogel Johnson Agar | `T = S + 1 + 1` |
| Baird Parker Agar | `T = S + 1 + 1` |
| Cetrimide Agar | `T = S + 1 + 1` |
| Pseudomonas Agar | `T = S + 1 + 1` |
| Selenite F Broth (Part A+B) | `T = S + 1 + 1` |
| Tetrathionate Broth | `T = S + 1 + 1` |
| Xylose Lysine Deoxycholate Agar | `T = S + 1 + 1` |
| Bishmuth Sulphite Agar | `T = S + 1 + 1` |
| Brilliant Green Agar | `T = S + 1 + 1` |
| Deoxycholate Citrate Agar | `T = S + 1 + 1` |
| Triple Sugar Iron Agar | `T = S + 1 + 1` |
| Urea Broth | `T = S + 1 + 1` |
| **R2A** (conditional — only if W > 0) | `T = W × 2` |
| Soybean Casein Digest Agar | `T = (N × 2) + 1 + 1` |
| Sabouraud Dextrose Agar | `T = (N × 2) + 1 + 1` |

Row order: items 1–18 above, then R2A (if W > 0), then SCDA, SDA.

### 5.3 Test Vectors (must pass)
- S=4, W=0 → SCDB 8; Mac Conkey's Broth 14; Peptone Water 6; SCDA 10; SDA 10.
- S=7, W=2 → R2A 4; SCDA 12; SDA 12.
- S=1, W=1 → SCDB 2; Mac Conkey's Broth 8; R2A 2; SCDA 2; SDA 2.

### 5.4 Balance Rules
- `Quantity Used = Tubes × QuantityPerTube` (from MediaMaster, backend only).
- Only SCDB quantity per tube is seeded (2.70 gm). Others: status `CALCULATION_BLOCKED`, alert `MISSING_QUANTITY_PER_TUBE`.
- `Balance = OpeningBalance − QuantityUsed`. Never negative.
- If `QuantityUsed > OpeningBalance`: status `REFILL_REQUIRED` (blocking). Show shortfall.
- Balance < threshold (default 10 gm): `LOW_STOCK` warning.
- Opening balance asked once (first date), then carried forward from previous date's balance.

---

## 6. Autoclave Log Book Rules

### 6.1 Generation
- One cycle per DATE (all samples that day = 1 entry). Idempotent.
- Default cycle load name: `"Media – DD-MM-YYYY (N samples)"`.
- Extra entries (Glassware, Plasticware, etc.) added manually only.
- Unique key: `logDate + load_type_id` (extend schema). Load types in a master table.
- Reprocessing never overwrites edited or VERIFIED entries.

### 6.2 Field Defaults (apply to newly generated entries ONLY)
| Field | Default |
|-------|---------|
| Autoclave Start Time | 11:00 AM |
| Sterilization Start Time | 11:10 AM |
| Temperature | 121 °C |
| Pressure | 15 LBS |
| Duration | 15 min |
| End Time | Sterilization Start + Duration (calculated) |
| Done By | Authenticated user |

### 6.3 Verification Flow
`PREFILLED → PENDING_VERIFICATION → VERIFIED`
- Only verifier/admin role can set VERIFIED.
- System NEVER auto-certifies sterilization or shows "successful" without verified readings.
- VERIFIED entries cannot be edited except by ADMIN who reopens them to DRAFT first.

### 6.4 Cleaning Schedule
- September pattern confirmed: 1, 7, 14, 21, 28 (anchor day 1, first interval 6, repeat 7).
- Settings kept configurable (not hardcoded). Works for 28–31 day months.
- Status computed at query time: SCHEDULED / COMPLETED / OVERDUE.
- Never auto-complete on the date.

---

## 7. Delivery Phases

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Repo inspection, AGENTS.md, project structure doc | ✅ Done |
| 2 | DB migrations (Prisma) for new tables | 🔲 Next |
| 3 | Step 1 corrections — backend API, then frontend | 🔲 Pending |
| 4 | Step 2 autoclave generation logic | 🔲 Pending |
| 5 | Autoclave page + settings | 🔲 Pending |
| 6 | Cleaning schedule | 🔲 Pending |
| 7 | Final Review & Downloads | 🔲 Pending |
| 8 | Tests, deployment steps, user guide | 🔲 Pending |

**Stop and wait for confirmation after each phase before starting the next.**

---

## 8. Environment Variables

### Backend (`backend/.env`)
```
NODE_ENV=development|production
DATABASE_URL=postgresql://...          # session-pooler
DIRECT_URL=postgresql://...            # direct (migrations only)
PORT=4000
API_HOST=0.0.0.0
CORS_ORIGINS=http://localhost:5173,https://<vercel-frontend-domain>
APP_BASE_URL=http://localhost:5173
SESSION_SECRET=<48-byte hex>
PASSWORD_PEPPER=<48-byte hex>
SESSION_TTL_MINUTES=480
SESSION_ABSOLUTE_TTL_MINUTES=1440
LOGIN_MAX_ATTEMPTS=5
LOGIN_LOCKOUT_MINUTES=15
LOGIN_RATE_LIMIT_WINDOW_MINUTES=15
LOGIN_RATE_LIMIT_MAX=10
GLOBAL_RATE_LIMIT_MAX=600
MAX_UPLOAD_BYTES=10485760
MAX_IMPORT_ROWS=20000
ALLOW_DEMO_SEED=false
TRUST_PROXY=1                          # set to 1 on Vercel
```

### Frontend (`frontend/.env`)
```
VITE_API_BASE_URL=http://localhost:4000   # dev
# prod: VITE_API_BASE_URL=https://<backend-vercel-domain>
```

---

## 9. Vercel Deployment Notes

- Backend is deployed as a **long-running Express server** via `@vercel/node` (see `vercel.json`).
- Frontend is a **separate Vercel project** (static SPA with rewrites).
- Set `TRUST_PROXY=1` on the backend Vercel project.
- Add the frontend Vercel domain to `CORS_ORIGINS` on the backend project.
- Add the backend Vercel domain to `VITE_API_BASE_URL` on the frontend project.
- After deploy: add the Vercel frontend URL to Supabase Auth redirect settings if Supabase Auth is ever used (currently using custom session auth — no Supabase Auth JWT is used in this project).

---

## 10. Column Mapping (Excel Import)

The configurable column mapping (stored in `AppSetting`) maps these logical fields to actual Excel headers:

| Logical Field | Default Excel Header |
|---|---|
| `sampleIdentifier` | `AR Number` |
| `sampleName` | `Sample Name` |
| `registrationDate` | `Test Request Date` |
| `sampleCategory` | *(derived from sampleName, not a column)* |
| `batchNumber` | `Batch Number` |

Never hardcode Excel header names in backend logic — always read from the stored mapping.

---

## 11. Print/Export Layout Reference

### Media Preparation Record
Header: "PETLAD MAHAL AROGYA MANDAL PHARMACY, At & Po. Village- Piplata- 387355, Ta.: Nadiad, Dist.: Kheda (Gujarat) – Media Preparation Record"
Columns: Date | Name of Media | Opening balance (gm) | Quantity Used (gm) | Balance Quantity (gm) | Tube/Plates | Used in | Prepared by
Footer: Prepared By / Approved By

### Autoclave Log Book (Sterilization)
Header: PETLAD MAHAL AROGYA MANDAL PHARMACY, Piplata
Sub-header: Autoclave Log Book (Sterilization)
Format No.: QC/M/023/F/01 | Ref. SOP No.: PM/QC/M/023 | Equipment No.: PM/QC/M/01
Columns: Date | Name of Cycle Load | Autoclave start time | Sterilization (Start Time, Temperature, Pressure, End Time) | Cleaning (weekly) | Done by

---

## 12. Key File Locations Quick Reference

| Purpose | File |
|---------|------|
| DB schema | `backend/prisma/schema.prisma` |
| DB seed | `backend/prisma/seed.ts` |
| Permissions matrix | `backend/src/lib/permissions.ts` |
| Audit logging | `backend/src/lib/audit.ts` |
| Time utilities | `backend/src/lib/time.ts` |
| Error helpers | `backend/src/lib/errors.ts` |
| Autoclave business logic | `backend/src/modules/autoclave/service.ts` |
| Autoclave routes | `backend/src/modules/autoclave/routes.ts` |
| Media routes | `backend/src/modules/media/routes.ts` |
| Import/Excel parsing | `backend/src/modules/imports/` |
| Frontend API client | `frontend/src/lib/api.ts` |
| Frontend type contracts | `frontend/src/types.ts` |
| Frontend date/time format | `frontend/src/lib/format.ts` |
| Autoclave page | `frontend/src/pages/AutoclavePage.tsx` |
| Media page | `frontend/src/pages/MediaPage.tsx` |
| Settings page | `frontend/src/pages/SettingsPage.tsx` |
