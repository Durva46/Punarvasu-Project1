# API Route Inventory and Role Permissions

**PETLAD MAHAL AROGYA MANDAL PHARMACY — Laboratory Management Software (LabFlow)**

All endpoints require a valid bearer token (except public health checks). Every request validates permissions server-side before querying the database.

---

## 1. Authentication & Base Endpoints

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | Server uptime and timestamp check |
| `GET` | `/api/v1/staff` | Any Active User | List active laboratory staff profiles |

---

## 2. Monthly Excel Import & Sample Analysis (`/api/v1/imports`)

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/imports/upload` | `admin`, `analyst` | Upload monthly sample Excel file (multipart/form-data) |
| `GET` | `/api/v1/imports` | Any Active User | List processed monthly reports |
| `GET` | `/api/v1/imports/:id` | Any Active User | Get report overview and column mapping validation |
| `GET` | `/api/v1/imports/:id/samples` | Any Active User | List samples with pagination, search, and date filters |
| `GET` | `/api/v1/imports/:id/daily-counts` | Any Active User | Daily sample count aggregation with water sample split ($S, W, N$) |

---

## 3. Media Preparation Workflow (`/api/v1/media`)

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/media/process` | `admin`, `analyst` | Calculate tube counts using safe formula engine for sample dates |
| `GET` | `/api/v1/media/records` | Any Active User | Get calculated media rows for a specific date |
| `POST` | `/api/v1/media/opening-balance`| `admin`, `analyst` | Enter initial opening balance for first sample date |
| `POST` | `/api/v1/media/refill` | `admin`, `analyst` | Record container refill when quantity used exceeds balance |
| `PATCH`| `/api/v1/media/override` | `admin`, `analyst` | Override calculated quantity used with mandatory reason |
| `GET` | `/api/v1/media/inventory` | Any Active User | Get current inventory balance across all media items |

---

## 4. Autoclave Log Book Workflow (`/api/v1/autoclave`)

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/autoclave/generate` | `admin`, `analyst` | Idempotent cycle generation (1 entry per date with samples) |
| `GET` | `/api/v1/autoclave/entries` | Any Active User | List sterilization cycles with search, date filters, and pagination |
| `POST` | `/api/v1/autoclave/entries` | `admin`, `analyst` | Add manual extra cycle entry (e.g. Glassware, Plasticware) |
| `PATCH`| `/api/v1/autoclave/entries/:id` | `admin`, `analyst` | Edit cycle parameters (recalculates end time if not overridden) |
| `POST` | `/api/v1/autoclave/entries/:id/reset-end-time` | `admin`, `analyst` | Reset overridden end time to calculated standard |
| `POST` | `/api/v1/autoclave/entries/:id/submit-for-verification` | `admin`, `analyst` | Transition cycle from `PREFILLED` to `PENDING_VERIFICATION` |
| `POST` | `/api/v1/autoclave/entries/:id/verify` | `admin`, `verifier` | Verify actual cycle readings; sets status to `VERIFIED` |
| `POST` | `/api/v1/autoclave/entries/:id/reject-verification` | `admin`, `verifier` | Return cycle to `PENDING_VERIFICATION` with mandatory reason |
| `GET` | `/api/v1/autoclave/entries/:id/history` | Any Active User | Audit timeline history for a specific autoclave entry |
| `GET` | `/api/v1/autoclave/summary` | Any Active User | Summary statistics for equipment, counts, and verifications |
| `GET` | `/api/v1/autoclave/settings` | Any Active User | Read autoclave defaults, limits, and cleaning rules |
| `PUT` | `/api/v1/autoclave/settings` | `admin` only | Update defaults, limits, and rules (affects new entries only) |
| `GET` | `/api/v1/autoclave/equipment` | Any Active User | Get equipment format, SOP, and serial numbers |
| `GET` | `/api/v1/autoclave/load-types` | Any Active User | List cycle load type master records |

---

## 5. Weekly Cleaning Schedule (`/api/v1/autoclave/cleaning`)

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/autoclave/cleaning/generate` | `admin`, `analyst` | Generate scheduled weekly cleaning dates (1, 7, 14, 21, 28) |
| `GET` | `/api/v1/autoclave/cleaning` | Any Active User | List cleaning schedule dates with real-time status in IST |
| `POST` | `/api/v1/autoclave/cleaning/:id/complete` | Any Active User | Mark scheduled cleaning as complete (actual date $\le$ today IST) |
| `POST` | `/api/v1/autoclave/cleaning/:id/reopen` | `admin`, `verifier` | Reopen completed cleaning entry (requires reason) |
| `GET` | `/api/v1/autoclave/cleaning/:id/history` | Any Active User | Audit timeline history for a cleaning schedule row |

---

## 6. Final Review & Exports (`/api/v1`)

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/final-review` | Any Active User | Real checklist summary of workflow completeness |
| `GET` | `/api/v1/exports/media` | Any Active User | Download Media Preparation Record (Excel `.xlsx` / PDF) |
| `GET` | `/api/v1/exports/autoclave` | Any Active User | Download Autoclave Log Book (Excel `.xlsx` / PDF) |
| `GET` | `/api/v1/exports/package` | Any Active User | Download Combined Monthly Package (2 sheets / continuous PDF) |
| `GET` | `/api/v1/exports/print-data` | Any Active User | JSON payload for dedicated browser print page |
| `GET` | `/api/v1/exports/log` | Any Active User | Audit log of recent downloads |

---

## 7. Laboratory Alerts & Notifications (`/api/v1/alerts`)

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/alerts` | Any Active User | List open/resolved alerts with type filtering |
| `POST` | `/api/v1/alerts/:id/resolve` | `admin`, `analyst` | Resolve active alert with resolution note |

---

*Note: Stages 3–7 are disabled placeholders ("To be provided") and have no backend endpoints or database tables.*
