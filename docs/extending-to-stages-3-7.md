# Guidelines for Extending to Stages 3–7

**PETLAD MAHAL AROGYA MANDAL PHARMACY — Laboratory Management Software (LabFlow)**

> **CRITICAL DIRECTIVE**: Stages 3–7 are currently placeholders marked "To be provided".
> **Do not write business logic, formulas, or database tables for stages 3–7 until laboratory SOPs and specifications are formally approved.**
> This document describes the architectural extension points for future developers.

---

## 1. Planned Placeholder Stages

- **Stage 3**: Laminar Air Flow (LAF) Log Book
- **Stage 4**: B.O.D. Incubator – Bacteria Log Book
- **Stage 5**: B.O.D. Incubator – Fungus Log Book
- **Stage 6**: B.O.D. Incubator – Pathogen Log Book
- **Stage 7**: Colony Counter Log Book

---

## 2. Standard Stage Implementation Pattern

When a stage is approved for development, follow the exact pattern established in Phases 3–6:

### A. Database Schema (`backend/prisma/schema.prisma`)
1. Create a dedicated equipment master table (if independent equipment exists, e.g. `LafEquipment`, `BodIncubatorEquipment`).
2. Create log entry tables with foreign keys to `reportId`:
   ```prisma
   model LafLogEntry {
     id          String   @id @default(cuid())
     reportId    String   @map("report_id")
     report      Report   @relation(fields: [reportId], references: [id])
     logDate     DateTime @map("log_date") @db.Date
     // Equipment parameters...
     status      String   @default("PREFILLED")
     createdById String?  @map("created_by_id") @db.Uuid
     createdAt   DateTime @default(now()) @map("created_at")
     updatedAt   DateTime @updatedAt @map("updated_at")

     @@map("laf_log_entries")
   }
   ```
3. Run `npm run db:migrate:dev --name add_stage_3_laf` to apply migrations.

### B. Shared Logic (`backend/src/modules/<stage>/shared.ts`)
- Pure TypeScript calculation logic (e.g. differential pressure checks, incubation duration).
- No database or network calls; unit-testable in isolation with Vitest.

### C. Backend API Module (`backend/src/modules/<stage>/`)
- Implement `service.ts` and `routes.ts`.
- Every route must use `requirePermission('<role>')`.
- State transitions must call `recordAudit()` in `backend/src/lib/audit.ts`.
- Input validation via Zod schemas on every route.

### D. Frontend Navigation & Page (`frontend/src/pages/<Stage>Page.tsx`)
- In `frontend/src/components/layout/Navbar.tsx`:
  - Move the stage item from `disabledStages` to `mainNavItems`.
- Follow the design language:
  - Light background (`bg-surface`), white cards, subtle borders (`border-line`).
  - Dates formatted as `DD-MM-YYYY` and times as 12-hour (`HH:MM AM/PM`).
  - No client-side recalculation of backend statuses.

### E. Final Review & Exports Integration
- Add checklist validation rule in `backend/src/modules/exports/service.ts`.
- Add stage export builders in `excelBuilder.ts` and `pdfBuilder.ts`.
- Integrate into the combined monthly package.
