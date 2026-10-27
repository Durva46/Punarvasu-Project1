# User Acceptance Testing (UAT) Checklist

**PETLAD MAHAL AROGYA MANDAL PHARMACY — Laboratory Management Software (LabFlow)**

**Testing Month**: September 2026  
**Test Unit**: QC / Microbiology Laboratory  
**Equipment No.**: PM/QC/M/01  

---

| # | Workflow Step | Test Case Action | Expected Result | Result (P/F) | Notes / Auditor Initials |
| :---: | :--- | :--- | :--- | :---: | :--- |
| **1** | **Excel Upload** | Upload monthly test registration `.xlsx` file. | File parses cleanly; AR numbers, sample names, dates, and water flags match spreadsheet rows. | [  ] | |
| **2** | **Water Detection** | Review Daily Sample Count tab for 4 samples (0 water) and 7 samples (2 water). | Day 1: $S=4, W=0, N=4$.<br>Day 2: $S=7, W=2, N=5$. Derived strictly from sample name. | [  ] | |
| **3** | **Initial Balance** | Open Day 1 Media Preparation Record for first time. | Prompts for initial opening balance. Entered value saves and sets starting inventory. | [  ] | |
| **4** | **Formula Calculations** | Verify tube counts for Day 1 ($S=4, W=0$):<br>• SCDB: 8<br>• Mac Conkey Broth: 14<br>• Peptone Water: 6<br>• SCDA: 10, SDA: 10 | Tube counts match formula engine. R2A is completely omitted on Day 1. | [  ] | |
| **5** | **R2A Conditional** | Verify tube counts for Day 2 ($S=7, W=2$):<br>• R2A: 4<br>• SCDA: 12, SDA: 12<br>• Mac Conkey Broth: 20 | R2A appears with 4 tubes ($W \times 2$). Mac Conkey Broth evaluates to 20. | [  ] | |
| **6** | **Continuous Balance** | Review Day 2 opening balance for SCDB. | Automatically equals Day 1 ending balance ($478.40\text{ gm}$). Does not prompt again. | [  ] | |
| **7** | **Refill Block** | Attempt to process date where Quantity Used exceeds available balance. | Row displays `REFILL_REQUIRED` (red). Balance does not drop below zero. Refill clears block. | [  ] | |
| **8** | **Quantity Override** | Click Edit Qty on a media row, enter new amount and reason. | Overridden amount saves; audit history records old value, new value, reason, and user. | [  ] | |
| **9** | **Autoclave Generation** | Click "Generate / Refresh Log Entries" on Autoclave Log Book page. | Exactly 1 cycle generated per date with samples. Defaults: 11:00 AM, 121 °C, 15 LBS, 15m. | [  ] | |
| **10**| **End Time Math** | Change sterilization start time from 11:10 AM to 11:20 AM. | End time automatically updates from 11:25 AM to 11:35 AM. | [  ] | |
| **11**| **Midnight Crossing**| Set sterilization start time to 11:50 PM with 15-minute duration. | End time displays `12:05 AM (+1 day)`. Offset flag is saved. | [  ] | |
| **12**| **Verification Signoff**| Log in as Verifier and click Verify on an autoclave cycle. | Records observed temperature and pressure. Badge changes from Planned to Verified. | [  ] | |
| **13**| **Verifier Restriction**| Attempt to verify a cycle while logged in as an Analyst. | Verify button is hidden/disabled; API rejects request with 403 Forbidden. | [  ] | |
| **14**| **Weekly Cleaning** | Click "Generate Cleaning Schedule" on Autoclave page. | Generates dates: 1, 7, 14, 21, 28 for September. Shows overdue for past dates in IST. | [  ] | |
| **15**| **Complete Cleaning** | Click Mark Complete on a scheduled cleaning date. | Status changes to Completed (green badge). Actual date cannot exceed today in IST. | [  ] | |
| **16**| **Final Review** | Open Final Review & Downloads (`/reports`). | Checklist shows status across all 6 steps. Incomplete items highlighted with amber warning. | [  ] | |
| **17**| **Media Sheet Export** | Download Media Preparation Record (Excel & PDF). | 3-line centered header, merged date cells, 2-decimal numbers, "—" for blocked cells, blank signature lines. | [  ] | |
| **18**| **Autoclave Export** | Download Autoclave Log Book (Excel & PDF). | Format/SOP/Equipment box, 4 sterilization sub-columns, 12h times, verified actuals on second line. | [  ] | |
| **19**| **Monthly Package** | Download Combined Monthly Package (Excel & PDF). | Excel has 2 sheets; PDF has continuous "Page X of Y" page numbering across both parts. | [  ] | |
| **20**| **Print View** | Click Print View on any card. | Opens clean page without navbar; browser print preview matches A4 landscape margins. | [  ] | |

---

## Sign-off & Regulatory Acceptance

| Role | Printed Name | Signature | Date |
| :--- | :--- | :--- | :--- |
| **Analyst (Operator)** | ___________________________ | ___________________________ | ____________ |
| **Quality Verifier** | ___________________________ | ___________________________ | ____________ |
| **Head of Quality Assurance** | ___________________________ | ___________________________ | ____________ |
