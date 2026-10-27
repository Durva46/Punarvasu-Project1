# System Architecture & Data Flow

**PETLAD MAHAL AROGYA MANDAL PHARMACY — Laboratory Management Software (LabFlow)**

---

## 1. High-Level Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        React 18 + Vite Frontend                        │
│             (Desktop-First, Tailwind CSS, Pure Presentation)           │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ HTTPS REST API
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      Express 4 Backend on Vercel                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
│  │   Auth / RBAC    │  │  Formula Engine  │  │   Export Builders    │  │
│  │   Middleware     │  │  (Safe AST/Lex)  │  │  (ExcelJS & PDFKit)  │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │               Prisma 6 ORM (19 Relational Models)                │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │                                 │
                   ▼                                 ▼
┌──────────────────────────────────────┐   ┌─────────────────────────────┐
│       Supabase PostgreSQL DB         │   │   Supabase Private Storage  │
│  • Transactional Session Pooler      │   │  • monthly-reports (Raw)    │
│  • Row-Level Security (RLS)          │   │  • exports (>4MB Archives)  │
│  • Timezone-Aware Views & Triggers   │   │  • Signed URLs (10 min)     │
└──────────────────────────────────────┘   └─────────────────────────────┘
```

---

## 2. End-to-End Workflow Data Flow

```
[Monthly Excel .xlsx]
        │
        ▼ (POST /api/v1/imports/upload)
[SheetJS Parser] ──► Validates Columns & Creates Report & Sample Rows (S, W, N)
        │
        ▼ (POST /api/v1/media/process)
[Formula Engine] ──► Evaluates Safe Expressions per Media (SCDB, Mac Conkey, R2A, SCDA)
        │            Calculates Tubes & Balance Continuity (Opening - Used = Balance)
        │
        ▼ (POST /api/v1/autoclave/generate)
[Cycle Generator] ─► 1 Sterilization Cycle per Date (Defaults: 11:00, 121°C, 15 LBS, 15m)
        │            Calculates End Time (Sterilization Start + Duration)
        │
        ▼ (POST /api/v1/autoclave/cleaning/generate)
[Cleaning Engine] ─► Generates Weekly Dates (1, 7, 14, 21, 28) in Asia/Kolkata
        │
        ▼ (POST /api/v1/autoclave/entries/:id/verify)
[Verifier Signoff] ► Records Actual Physical Temperature & Pressure Gauge Readings
        │
        ▼ (GET /api/v1/exports/*)
[Export Engines]  ─► Generates Formal Laboratory Excel & PDF Sheets (Print View)
```

---

## 3. Technology Inventory

| Layer | Component | Version | Rationale |
| :--- | :--- | :--- | :--- |
| **Frontend** | React + TypeScript + Vite | React 18, Vite 5 | High-performance SPA with zero client-side business calculations. |
| **Styling** | Tailwind CSS | v3 | Consistent light medical theme (`bg-surface`, `border-line`, blue/green accents). |
| **Backend** | Node.js + Express + TypeScript | Node $\ge$ 20, Express 4 | Stateless REST API hosted on Vercel serverless platform. |
| **Database** | Supabase (PostgreSQL) | PostgreSQL 15 | Managed PostgreSQL with transaction pooling, RLS, and triggers. |
| **ORM** | Prisma 6 | v6.0 | Strict schema definition, type safety, and migration management. |
| **Spreadsheets**| SheetJS (xlsx) & ExcelJS | ExcelJS 4 | SheetJS for input parsing; ExcelJS for cell merging, styling, and freeze panes. |
| **PDF Engine** | pdfkit | v0.15 | Fast native streaming PDF generation without headless Chrome or Puppeteer. |
| **Testing** | Vitest | v2.1 | Fast in-memory unit, API, scenario, and data integrity test runner. |
