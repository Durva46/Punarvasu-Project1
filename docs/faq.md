# Frequently Asked Questions (FAQ)

**PETLAD MAHAL AROGYA MANDAL PHARMACY — Laboratory Management Software (LabFlow)**

---

### Q1: Why is a media row showing "CALCULATION BLOCKED"?
**A**: A media preparation row displays `CALCULATION_BLOCKED` when the standard mass per tube (`quantityPerTube`) is not configured in the Media Master database. By default, only Soybean Casein Digest Broth (SCDB) is seeded with 2.70 gm. To unblock:
1. Log in as an **Admin**.
2. Navigate to **Settings** $\rightarrow$ **Media Master**.
3. Enter the standard grams per tube for the media item and save.
4. Return to the Media page and refresh.

---

### Q2: Why is R2A Agar missing on some dates?
**A**: R2A Agar is conditional: it is included **only on dates with water samples** ($W > 0$). If all samples on a date are raw materials, finished products, or non-water items ($W = 0$), R2A Agar is intentionally omitted from the preparation list and export files per laboratory specifications.

---

### Q3: Why does the number of samples differ from what I typed?
**A**: Sample counts ($S$), water samples ($W$), and non-water samples ($N$) come **strictly from the uploaded monthly Excel file**. LabFlow never accepts manually typed sample counts in order to maintain complete regulatory data integrity with the testing registration log.

---

### Q4: Why is an autoclave cycle entry showing "Planned" instead of "Verified"?
**A**: When autoclave cycles are first generated, they contain laboratory planned default values (e.g. 11:00 AM, 121 °C, 15 LBS). An entry remains "Planned" until:
1. An Analyst enters actual observed cycle times and submits it for verification.
2. A qualified Verifier or Admin reviews the physical gauge chart and confirms the readings.
*LabFlow will never automatically mark a cycle as "verified" or "sterilized".*

---

### Q5: If I change default settings (like duration or temperature), does it alter old entries?
**A**: **No.** Changing planned defaults in Settings affects **only newly generated cycle entries**. All previously generated, edited, or verified entries are permanently protected and will not be altered.

---

### Q6: Can I download the monthly package if some verifications are still pending?
**A**: **Yes.** Downloads are **always permitted**. If verifications are pending, an informational banner appears, and the exported files clearly label unverified entries as "Planned" or "Pending verification".

---

### Q7: What happens if an autoclave cycle runs past midnight?
**A**: LabFlow automatically calculates midnight crossings. For example, a cycle starting at 11:50 PM with a 15-minute duration computes an end time of `12:05 AM (+1 day)`. Both the application and export files explicitly display the `(+1 day)` offset.

---

### Q8: What happens when the weekly cleaning schedule rule is changed?
**A**: Completed cleaning records are **never modified or deleted**. Past scheduled rows that no longer match the rule are preserved as overdue records, and only future obsolete scheduled rows are removed.

---

### Q9: When will Stages 3 through 7 (LAF, Incubators, Colony Counter) be available?
**A**: Stages 3–7 are currently disabled placeholders ("To be provided") reserved for upcoming project phases. The navigation links remain disabled to prevent inadvertent workflow confusion.
