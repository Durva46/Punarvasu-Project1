# CHANGELOG

All notable changes to the **PETLAD MAHAL AROGYA MANDAL PHARMACY** Laboratory Management Software (LabFlow) are documented here.

---

## [Phase 8] - 2026-10-27 (Full Testing, Security Review & Documentation)
- **Traceability Matrix**: Created `docs/traceability.md` mapping every rule in `AGENTS.md` to code and tests.
- **Security Audit**: Verified zero secret leaks in frontend bundle; verified `requirePermission()` across all endpoints; added HTTP security headers to `vercel.json`.
- **API Inventory**: Published `docs/api-routes.md` listing all endpoints and allowed roles.
- **Automated Tests**: Added role permissions matrix test (`rolePermissions.test.ts`), data robustness and large-month performance test (`dataIntegrity.test.ts`), and end-to-end user scenario simulation test (`e2eWorkflow.test.ts`). Total backend vitest suites: 59 passed.
- **Documentation**: Published `docs/deployment.md`, `quick-start.md`, `staff-guide.md`, `admin-guide.md`, `faq.md`, `troubleshooting.md`, `architecture.md`, `extending-to-stages-3-7.md`, `open-confirmations.md`, `uat-checklist.md`, and `final-report.md`.
- **Scripts**: Added root npm scripts `check:all`, `test:unit`, `test:api`, `test:e2e`, and `typecheck`.

## [Phase 7] - 2026-10-27 (Final Review & Downloads / Export Engines)
- **Excel & PDF Engines**: Implemented pure `exceljs` and `pdfkit` builders matching laboratory sheets (3-line centered media header, merged date cells, equipment info box, 4 sterilization sub-columns, 12h times, and continuous pagination).
- **Dual Delivery**: Direct streaming under 4MB; private Supabase `exports` bucket with signed URL fallback for large files.
- **Final Review Page**: Built checklist verifying Excel imports, Media preparation, Autoclave cycle generation, Verification signoff, Cleaning, and Alerts.
- **Print Views**: Created dedicated `/print` view page styled for A4 landscape with repeated table headers.
- **Toolbar Action**: Enabled Export Excel & PDF buttons on the Autoclave Log Book page.

## [Phase 6] - 2026-10-27 (Weekly Cleaning Schedule)
- **Cleaning Schedule Engine**: Implemented anchor day 1, second day 7, interval 7 schedule generator for 28–31 day months.
- **Timezone Awareness**: Updated `v_autoclave_cleaning_status` to evaluate today in `Asia/Kolkata`.
- **Decoupling**: Ensured cleaning completion is strictly independent from sterilization cycle verification.
- **UI & Actions**: Built `AutoclaveCleaningPanel`, overdue alert banners, unattached cleaning notices, completion modal, and reopen action.

## [Phase 5] - 2026-10-27 (Autoclave Frontend)
- **Autoclave Log Book Page**: Month picker, summary cards from live API, disclaimer banners, responsive main table, edit drawer, verification modal, sources drawer, and history drawer.
- **Settings Screen**: Cycle defaults, acceptance limits, equipment numbers, and cleaning preview.

## [Phase 4] - 2026-10-27 (Autoclave Backend API)
- **Cycle Generation**: One cycle per date combining all samples registered on that date.
- **Time Calculation**: Automated end time math with midnight-crossing support (+1 day offset).
- **Verification Logic**: `PREFILLED → PENDING_VERIFICATION → VERIFIED` state machine with verifier role restrictions.

## [Phase 3] - 2026-10-27 (Media Preparation)
- **Safe Formula Parser**: Recursive descent AST parser supporting $S, W, N$, $+$, $-$, $*$, and parentheses.
- **Formula Engine**: Implemented test vectors for S=4, W=0, and S=7, W=2. Conditional R2A ($W > 0$).
- **Continuous Inventory**: Initial opening balance asked once, carried forward daily, refill blocks, and quantity overrides.

## [Phase 2] - 2026-10-27 (Database Schema & Migrations)
- **Prisma Schema**: 19 relational models with UUID primary keys and audit columns.
- **Supabase Migrations**: Added RLS policies, audit triggers, and idempotent seed scripts.

## [Phase 1] - 2026-10-27 (Project Scaffolding)
- Monorepo setup with React 18 frontend and Express 4 backend.
- Authoritative reference `AGENTS.md` established.
