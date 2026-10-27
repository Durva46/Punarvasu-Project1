# Requirements Traceability Matrix (RTM)

**PETLAD MAHAL AROGYA MANDAL PHARMACY — Laboratory Management Software (LabFlow)**

This document maps every business requirement, mathematical formula, validation rule, security standard, and export layout from [AGENTS.md](../AGENTS.md) to its implementation source code and automated test suite.

---

## 1. Traceability Table

| Ref | Requirement / Business Rule | Implementation Location | Automated Test Location | Status |
| :--- | :--- | :--- | :--- | :--- |
| **BR-01** | **Safe Expression Evaluation**: Media formulas parsed with safe recursive descent parser supporting S, W, N, integers, `+`, `-`, `*`, parentheses; rejects `eval`/`Function`. | `backend/src/modules/media/formulaParser.ts` | `backend/src/modules/media/__tests__/formulaParser.test.ts` | ✅ Verified |
| **BR-02** | **Unsimplified Formula Preservation**: `(S + 1 + 1 + 1) * 2` evaluated exactly as written; returns original display string. | `backend/src/modules/media/formulaParser.ts` | `backend/src/modules/media/__tests__/formulaParser.test.ts` | ✅ Verified |
| **BR-03** | **Tube Count Test Vectors**: <br>• $S=4, W=0 \rightarrow$ SCDB 8, Mac Conkey 14, Peptone 6, SCDA 10, SDA 10, no R2A.<br>• $S=7, W=2 \rightarrow$ R2A 4, SCDA 12, SDA 12, Mac Conkey 20.<br>• $S=1, W=1 \rightarrow$ SCDB 2, Mac Conkey 8, R2A 2, SCDA 2, SDA 2. | `backend/src/modules/media/formula.ts` | `backend/src/modules/media/__tests__/formula.test.ts` | ✅ Verified |
| **BR-04** | **Quantity Used Calculation**: $\text{Quantity Used} = \text{Tube/Plates} \times \text{quantityPerTube}$. Stored with 4 decimals, formatted with 2. | `backend/src/modules/media/service.ts` | `backend/src/modules/media/__tests__/formula.test.ts` | ✅ Verified |
| **BR-05** | **Calculation Blocked State**: If `quantityPerTube` is null (all except SCDB initially), row status becomes `CALCULATION_BLOCKED` and triggers alert. | `backend/src/modules/media/service.ts` | `backend/src/modules/media/__tests__/formula.test.ts` | ✅ Verified |
| **BR-06** | **Balance & Refill Required**: $\text{Balance} = \text{Opening} - \text{Quantity Used}$. If $\text{Quantity Used} > \text{Opening}$, status becomes `REFILL_REQUIRED` and balance is never negative. | `backend/src/modules/media/service.ts` | `backend/src/modules/exports/__tests__/exportBuilders.test.ts` | ✅ Verified |
| **BR-07** | **Opening Balance Continuity**: Opening balance entered once on initial day; carried forward to subsequent dates automatically. | `backend/src/modules/media/service.ts` | `backend/src/modules/__tests__/e2eWorkflow.test.ts` | ✅ Verified |
| **BR-08** | **Autoclave Cycle Generation**: Exactly 1 cycle per date combining all samples registered on that date. Extra loads added manually. | `backend/src/modules/autoclave/service.ts` | `backend/src/modules/autoclave/__tests__/autoclaveService.test.ts` | ✅ Verified |
| **BR-09** | **Autoclave Field Defaults**: Start Time: `11:00 AM`, Sterilization: `11:10 AM`, Temp: `121 °C`, Pressure: `15 LBS`, Duration: `15 min`. | `backend/src/modules/autoclave/shared.ts` | `backend/src/modules/autoclave/__tests__/shared.test.ts` | ✅ Verified |
| **BR-10** | **End Time & Midnight Crossing**: Calculated automatically. $23:50 + 15\text{ min} = 00:05 \text{ (+1 day offset)}$. Manual end times preserved. | `backend/src/lib/time.ts` | `backend/src/modules/autoclave/__tests__/shared.test.ts` | ✅ Verified |
| **BR-11** | **Sterilization Verification Flow**: `PREFILLED → PENDING_VERIFICATION → VERIFIED`. Only verifier/admin can verify. No auto-certification of "sterilized". | `backend/src/modules/autoclave/service.ts` | `backend/src/modules/autoclave/__tests__/autoclaveService.test.ts` | ✅ Verified |
| **BR-12** | **Weekly Cleaning Schedule Engine**: Anchor Day 1, Second Day 7, Interval 7 (1, 7, 14, 21, 28). Works across 28, 29, 30, and 31-day months. | `backend/src/modules/autoclave/cleaningShared.ts` | `backend/src/modules/autoclave/__tests__/cleaningShared.test.ts` | ✅ Verified |
| **BR-13** | **Timezone Correctness**: Laboratory dates and cleaning status evaluated in `Asia/Kolkata` (`(timezone('Asia/Kolkata', now()))::date`). | `backend/src/modules/autoclave/cleaningShared.ts` | `backend/src/modules/autoclave/__tests__/cleaningService.test.ts` | ✅ Verified |
| **BR-14** | **Cleaning Row Preservation**: Completed cleaning rows survive rule changes. Past scheduled rows kept as overdue; future obsolete rows deleted. | `backend/src/modules/autoclave/cleaningService.ts` | `backend/src/modules/autoclave/__tests__/cleaningService.test.ts` | ✅ Verified |
| **BR-15** | **Cleaning Independence**: Chamber cleaning completion is strictly decoupled from sterilization verification. | `backend/src/modules/autoclave/cleaningService.ts` | `backend/src/modules/autoclave/__tests__/cleaningService.test.ts` | ✅ Verified |
| **BR-16** | **Media Preparation Sheet Layout**: 3-line centered header, 8 columns grouped by date, 2 decimal numbers, "—" for blocked cells, blank signature lines. | `backend/src/modules/exports/excelBuilder.ts`<br>`backend/src/modules/exports/pdfBuilder.ts` | `backend/src/modules/exports/__tests__/exportBuilders.test.ts` | ✅ Verified |
| **BR-17** | **Autoclave Log Book Layout**: Equipment info box, 4 sub-columns under sterilization, 12h times, actual readings for verified entries, disclaimer footnote. | `backend/src/modules/exports/excelBuilder.ts`<br>`backend/src/modules/exports/pdfBuilder.ts` | `backend/src/modules/exports/__tests__/exportBuilders.test.ts` | ✅ Verified |
| **BR-18** | **Combined Monthly Package**: Single Excel workbook with 2 sheets; single PDF with continuous page numbering ("Page X of Y"). | `backend/src/modules/exports/excelBuilder.ts`<br>`backend/src/modules/exports/pdfBuilder.ts` | `backend/src/modules/exports/__tests__/exportBuilders.test.ts` | ✅ Verified |
| **BR-19** | **Immutable Audit Log**: Every state-changing route writes to `AuditLog`. Records cannot be edited or deleted by any API route. | `backend/src/lib/audit.ts` | `backend/src/modules/__tests__/rolePermissions.test.ts` | ✅ Verified |
| **BR-20** | **Role Permissions Matrix**: Granular server-side role enforcement (`ADMIN`, `ANALYST`, `VERIFIER`, `VIEWER`). Denials return 401/403. | `backend/src/lib/permissions.ts` | `backend/src/modules/__tests__/rolePermissions.test.ts` | ✅ Verified |
| **BR-21** | **Large File Delivery**: Direct streaming under 4 MB; upload to private Supabase `exports` bucket with signed URL fallback for large files. | `backend/src/modules/exports/service.ts` | `backend/src/modules/exports/__tests__/exportService.test.ts` | ✅ Verified |

---

*Generated and verified as part of Phase 8 quality audit.*
