# Laboratory Administrator Guide

**PETLAD MAHAL AROGYA MANDAL PHARMACY — Laboratory Management Software (LabFlow)**

---

## 1. User Roles & Permission Matrix

LabFlow enforces role-based access control (RBAC) at the server level. The four standard roles are:

| Capability | Admin | Analyst | Verifier | Viewer |
| :--- | :---: | :---: | :---: | :---: |
| Upload Monthly Excel | ✅ | ✅ | ❌ | ❌ |
| Process Media Preparation | ✅ | ✅ | ❌ | ❌ |
| Record Initial Balance & Refills | ✅ | ✅ | ❌ | ❌ |
| Generate Autoclave Cycles | ✅ | ✅ | ❌ | ❌ |
| Add Extra Manual Load Entries | ✅ | ✅ | ❌ | ❌ |
| Submit Cycle for Verification | ✅ | ✅ | ❌ | ❌ |
| Verify Cycle Readings | ✅ | ❌ | ✅ | ❌ |
| Reopen Verified Cycle to Draft | ✅ | ❌ | ❌ | ❌ |
| Generate Weekly Cleaning Schedule | ✅ | ✅ | ❌ | ❌ |
| Complete Weekly Cleaning | ✅ | ✅ | ✅ | ❌ |
| Reopen Completed Cleaning Entry | ✅ | ❌ | ✅ | ❌ |
| Download Reports (Excel / PDF / Print) | ✅ | ✅ | ✅ | ✅ |
| Configure Settings, Equipment & Master Data | ✅ | ❌ | ❌ | ❌ |
| View System Audit Trail | ✅ | ✅ | ✅ | ✅ |

---

## 2. Managing Staff & Role Assignments

1. Navigate to **Settings** $\rightarrow$ **Staff Management**.
2. To create a new user:
   - Create the user account in Supabase Auth.
   - Enter their full name, email, and assign an active role (`analyst`, `verifier`, or `viewer`).
3. To deactivate a staff member who has left the unit:
   - Toggle **Active Status** to `Disabled`.
   - Deactivated users are immediately blocked from logging in or calling API routes.
   - Historical records and signatures preserved indefinitely.

---

## 3. Media Master & Quantity per Tube Configuration

1. Go to **Settings** $\rightarrow$ **Media Master**.
2. **Standard Seeded Values**:
   - `Soybean Casein Digest Broth`: `2.70 gm/tube`.
   - Other media formulas are seeded with `null` quantity per tube initially.
3. **Configuring Grams per Tube**:
   - Click **Edit** next to any media item (e.g. `Mac Conkey's Broth`, `Peptone Water`, `SCDA`, `SDA`).
   - Enter the laboratory's standard recipe grams per tube/plate.
   - Click **Save**.
   - Any previously blocked rows for this media will automatically be unlocked for quantity calculation upon the next calculation run.
4. **Row Display Order**:
   - Items 1–18 in standard laboratory sequence, followed by R2A (only rendered when water samples exist), then SCDA and SDA.

---

## 4. Autoclave Parameters & Acceptance Limits

1. Navigate to **Autoclave Settings** (`/settings/autoclave`).
2. **Cycle Planned Defaults**:
   - Autoclave Start Time (24h): `11:00`
   - Sterilization Start Time (24h): `11:10`
   - Sterilization Duration: `15 minutes`
   - Temperature: `121 °C`
   - Pressure: `15 LBS`
   - *Note*: Changing defaults applies **only to newly generated entries**. Saved entries remain untouched.
3. **Acceptance Limits (Warning Thresholds)**:
   - `Temperature Min / Max`: e.g. `120.0 °C` to `122.0 °C`.
   - `Pressure Min / Max`: e.g. `14.5 LBS` to `15.5 LBS`.
   - When actual verified readings fall outside these thresholds, the system flags the entry with a yellow **Outside approved limits** badge. It does not delete or block the entry.
4. **Equipment Identification**:
   - **Format No.**: `QC/M/023/F/01`
   - **Ref. SOP No.**: `PM/QC/M/023`
   - **Equipment No.**: `PM/QC/M/01`
5. **Weekly Cleaning Schedule Rules**:
   - Anchor Day (First Day): `1`
   - Second Day: `7`
   - Interval: `7`
   - Live preview demonstrates the 5 scheduled cleaning dates for 30-day and 31-day months (1, 7, 14, 21, 28).

---

## 5. Reviewing the Audit Trail

- In compliance with regulatory standards, every state-changing route generates an immutable audit record.
- To view an entry's audit trail, click **History** in the Autoclave Log Book or Cleaning Schedule panel.
- Details captured: Action type, field modified, previous value, new value, reason for edit, user identity, and timestamp.
- **Audit records cannot be edited or deleted by any user or administrator.**
