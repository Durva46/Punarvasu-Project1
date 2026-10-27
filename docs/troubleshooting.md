# Laboratory Troubleshooting Guide

**PETLAD MAHAL AROGYA MANDAL PHARMACY — Laboratory Management Software (LabFlow)**

---

## 1. Excel Upload & Import Problems

### Problem: File upload rejected with "Invalid File Type"
- **Cause**: Only Microsoft Excel OpenXML spreadsheets (`.xlsx`) are accepted.
- **Solution**: Ensure your spreadsheet is saved in modern `.xlsx` format. Older binary `.xls` files must be opened in Excel and resaved as `.xlsx`.

### Problem: Error "Required column mapping not found"
- **Cause**: The column headers in the uploaded Excel do not match the expected names or stored column mappings.
- **Solution**:
  1. Open the file and verify headers: `AR Number`, `Test Request Date`, `Sample Name`, `Batch Number`.
  2. If your pharmacy uses custom headers (e.g. "Sample ID" instead of "AR Number"), an Admin can update the mapping under **Settings** $\rightarrow$ **Column Mappings**.

### Problem: Duplicate AR Numbers detected
- **Cause**: Two samples share the exact same AR Number within the same monthly file.
- **Solution**: Open the source Excel file, correct the typographical duplicate identifier, and upload again.

---

## 2. Media Preparation Blocks

### Problem: Status reads "REFILL REQUIRED" (Row is highlighted in red)
- **Cause**: The calculated quantity of media powder needed for the day's sample count exceeds the remaining container balance.
- **Solution**:
  1. Click the **Record Refill** button next to the media item.
  2. Enter the mass of the newly opened container (in grams) and lot number.
  3. Submit to immediately clear the block.

### Problem: Initial Opening Balance prompt does not appear
- **Cause**: An initial opening balance was already submitted for this monthly report.
- **Solution**: To adjust the starting inventory, an Admin or Analyst can edit the balance directly on Date 1 with a mandatory audit reason.

---

## 3. Autoclave Log Book Issues

### Problem: Cannot verify an autoclave entry (Verify button missing or disabled)
- **Cause**: The logged-in user account has the `analyst` or `viewer` role.
- **Solution**: Verification is restricted by SOP to users with the **verifier** or **admin** role. Log in with a Verifier account.

### Problem: Cycle end time is not updating when changing sterilization start time
- **Cause**: The end time was previously typed in manually, which flags `endTimeOverridden = true`.
- **Solution**: Click the **Reset End Time** button in the entry edit drawer. This removes the manual override and recalculates the end time from `Start Time + Duration`.

---

## 4. Export & Download Issues

### Problem: Download fails with "Nothing to export for this month yet" (404)
- **Cause**: The selected month has no sample or autoclave records in the database.
- **Solution**: Select a month with processed monthly data (e.g. September 2026).

### Problem: PDF export opens in a new tab without downloading
- **Cause**: Browser PDF viewer extension settings.
- **Solution**: Use the browser's save/download icon in the PDF viewer tab, or right-click **Export PDF** and select **Save Link As...**.

### Problem: Large file download takes longer than expected
- **Cause**: Files exceeding 4 MB are automatically archived to private cloud storage to respect serverless payload limits.
- **Solution**: The system generates a temporary secure signed URL. Allow 5–10 seconds for the cloud storage redirect to complete.
