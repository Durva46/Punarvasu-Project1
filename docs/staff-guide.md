# Laboratory Staff User Guide

**PETLAD MAHAL AROGYA MANDAL PHARMACY — Laboratory Management Software (LabFlow)**

---

## 1. Status Badges & Visual Indicators

| Badge | Color | Meaning & Required Action |
| :--- | :--- | :--- |
| **READY** | Emerald / Green | Calculations are complete and inventory balance is sufficient. |
| **LOW STOCK** | Amber / Yellow | Container balance is below the configured alert threshold (default 10 gm). Plan container refill. |
| **REFILL REQUIRED** | Red | **Blocking action**. Quantity used on this date exceeds remaining balance. Click **Record Refill** to add stock before proceeding. |
| **CALCULATION BLOCKED** | Red | `quantityPerTube` is missing for this media in Media Master. An Admin must configure grams per tube in Settings. |
| **PLANNED** | Gray | Planned laboratory default values for the cycle. Not yet confirmed by operator readings. |
| **PENDING VERIFICATION** | Blue | Cycle readings have been entered and submitted; waiting for Verifier sign-off. |
| **VERIFIED** | Green | A qualified Verifier or Admin has confirmed the physical autoclave temperature and pressure readings. |
| **SCHEDULED** | Amber | Weekly chamber cleaning is planned for this date. |
| **COMPLETED** | Emerald | Weekly chamber cleaning has been performed and logged by staff. |
| **OVERDUE** | Rose / Red | Scheduled cleaning date is in the past relative to laboratory time (`Asia/Kolkata`) and has not yet been logged as complete. |

---

## 2. Media Preparation Workflows

### A. Entering the Initial Opening Balance
- On the first date with sample records in a monthly report, LabFlow prompts: *"Initial Opening Balance Required"*.
- Enter the physical weighed mass (in grams) for each active media container.
- Once submitted, this balance is locked as the starting inventory. All subsequent dates automatically carry forward the previous day's ending balance.

### B. Overriding Quantity Used
- In exceptional laboratory scenarios (e.g., extra tube prepared due to spillage), click **Edit Qty** next to the media row.
- Enter the new quantity in grams and enter a mandatory reason.
- The change is flagged as `Overridden` and logged to the permanent audit trail.

### C. Container Refill
- When a refill is required, click **Record Refill**.
- Enter the refilled amount (e.g. 500.0 gm) and container lot/batch number.
- Balance is immediately restored to `(Previous Balance + Refill Amount - Quantity Used)`.

---

## 3. Autoclave Log Book Operations

### A. End Time Calculation Rule
- When an entry is generated or edited, the end time is automatically computed:
  $$\text{End Time} = \text{Sterilization Start Time} + \text{Duration Minutes}$$
- **Midnight Crossing**: If sterilization starts at `11:50 PM` with a 15-minute cycle, the end time displays:
  `12:05 AM (+1 day)`.
- If you manually type an end time in the edit drawer, it is saved with `endTimeOverridden = true`. To revert to the calculated standard, click **Reset End Time**.

### B. Verification Workflow
1. An Analyst edits the cycle with actual start/end readings and clicks **Submit for Verification**. Status changes to **Pending verification**.
2. A Verifier reviews the physical autoclave chart / pressure gauge:
   - Clicks **Verify**.
   - Confirms temperature (e.g. `121.2 °C`) and pressure (e.g. `15.1 LBS`).
   - Clicks **Confirm Verification**.
   - Entry status updates to **Verified** with the verifier's name and timestamp.
3. If readings are incorrect or outside approved limits, the Verifier clicks **Reject / Return to Pending** and provides a reason.

### C. Weekly Cleaning Schedule
- Cleaning dates follow the 1st of the month anchor rule: **1, 7, 14, 21, and 28**.
- Click **Mark Complete** on or after the cleaning date.
- Enter the actual cleaning date (must not be in the future relative to Indian Standard Time) and optional cleaning notes (e.g., *"Chamber wiped with 70% IPA"*).
- If a mistake was made, a Verifier can click **Reopen** to return the entry to Scheduled status.

---

## 4. Final Review & Exports

- Navigate to **Final Review & Downloads** (`/reports`).
- Review the checklist to ensure all monthly sample dates have media records and autoclave cycles.
- Click **Export Excel**, **Export PDF**, or **Print View** on any card.
- **Important**: Downloads are always permitted, even with incomplete verifications or warnings. Unverified entries are labelled on all documents.
- If any entry is edited after downloading, simply return to this page and click download again. LabFlow always generates files from live database records.

---

*Screenshot placeholder: [Screenshot of Autoclave Log Book main table with status badges and toolbar]*
*Screenshot placeholder: [Screenshot of Final Review & Downloads checklist and export cards]*
