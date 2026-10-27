# PETLAD MAHAL AROGYA MANDAL PHARMACY — Laboratory Management Software (LabFlow)

**Manufacturing Unit Automation & Laboratory Workflow Management**

LabFlow automates monthly sample registration analysis, media preparation records with continuous balance tracking, autoclave sterilization log books with weekly chamber cleaning, and regulatory print/export package generation.

---

## 1. Quick Navigation & Workflow

1. **Monthly Excel Import** (`/imports`): Upload test request spreadsheets; auto-detects sample counts ($S$), water samples ($W$), and non-water samples ($N$).
2. **Media Preparation** (`/media`): Calculates tube/plate formulas safely without `eval`, enforces opening balance continuity, and flags low stock or refill blocks.
3. **Autoclave Log Book** (`/autoclave`): Generates 1 sterilization cycle per date, computes end times and midnight offsets, tracks weekly cleaning, and manages verifier sign-offs.
4. **Final Review & Downloads** (`/reports`): Live checklist of workflow completeness, Excel/PDF downloads, and browser print views.
5. *Stages 3–7*: Laminar Air Flow, B.O.D. Incubators, and Colony Counter are disabled placeholders ("To be provided") reserved for future phases.

---

## 2. Project Documentation Index (`/docs`)

All technical and laboratory user guides are available in the [`/docs`](./docs) directory:
- [Requirements Traceability Matrix](./docs/traceability.md)
- [API Routes & Role Permissions Matrix](./docs/api-routes.md)
- [Production Deployment Checklist](./docs/deployment.md)
- [One-Page Quick Start Guide](./docs/quick-start.md)
- [Staff User Guide](./docs/staff-guide.md)
- [Administrator Configuration Guide](./docs/admin-guide.md)
- [Frequently Asked Questions (FAQ)](./docs/faq.md)
- [Troubleshooting Guide](./docs/troubleshooting.md)
- [System Architecture & Data Flow](./docs/architecture.md)
- [Guidelines for Extending to Stages 3–7](./docs/extending-to-stages-3-7.md)
- [Open Laboratory Confirmations](./docs/open-confirmations.md)
- [User Acceptance Testing (UAT) Sign-off Sheet](./docs/uat-checklist.md)
- [Final Engineering Report](./docs/final-report.md)

---

## 3. Local Development & Verification Commands

```bash
# 1. Run all unit and scenario test suites (59 backend tests, 3 frontend tests)
npm run test:unit
npm run test:api
npm run test:e2e

# 2. Run TypeScript strict typecheck across backend and frontend
npm run typecheck

# 3. Run complete verification check (typecheck + test:unit + frontend tests + production build)
npm run check:all

# 4. Start local development server (concurrently runs backend on 4000 and frontend on 5173)
npm run dev
```

---

## 4. Environment Variables

### Backend (`backend/.env`)
```env
NODE_ENV=development
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres"
SUPABASE_URL="https://[ref].supabase.co"
SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."
PORT=4000
API_HOST=0.0.0.0
CORS_ORIGINS=http://localhost:5173,https://<your-vercel-domain>
APP_BASE_URL=http://localhost:5173
TRUST_PROXY=1
```

### Frontend (`frontend/.env`)
```env
VITE_API_BASE_URL=http://localhost:4000
```
