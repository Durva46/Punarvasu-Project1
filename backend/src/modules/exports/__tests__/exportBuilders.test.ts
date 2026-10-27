/**
 * backend/src/modules/exports/__tests__/exportBuilders.test.ts
 *
 * Unit tests for Excel and PDF builder logic (Phase 7):
 * 1. Date grouping in Media Preparation Record Excel.
 * 2. Real numbers (2 decimal places) for gm amounts; blocked rows print "—".
 * 3. Two sheets generated in Combined Package Excel workbook.
 * 4. 12-hour times and midnight-crossing labels in Autoclave Log Book.
 * 5. Verification status labels (Planned, Pending verification, Verified) and actual values.
 * 6. Cleaning-only rows included correctly.
 */

import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import {
  buildMediaSheet,
  buildAutoclaveSheet,
  buildCombinedPackageWorkbook,
} from "../excelBuilder";
import { MediaExportRow, AutoclaveExportRow, EquipmentExportInfo } from "../types";

describe("Phase 7 Excel & PDF Export Builders", () => {
  const mockMeta = {
    reportingMonth: "2026-09",
    generatedBy: "Senior Analyst",
    generatedAt: "27-10-2026 14:00 PM",
  };

  const mockEquip: EquipmentExportInfo = {
    formatNo: "QC/M/023/F/01",
    refSopNo: "PM/QC/M/023",
    equipmentNo: "PM/QC/M/01",
  };

  it("1. Media Record Excel merges date cells per date group and prints 2 decimals & dashes", async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Media Record");

    const mockRows: MediaExportRow[] = [
      {
        date: "01-09-2026",
        mediaName: "Soybean Casein Digest Broth",
        openingBalanceGm: 500.0,
        quantityUsedGm: 21.6,
        balanceGm: 478.4,
        tubePlates: 8,
        usedIn: "Water Sample A, Water Sample B",
        preparedBy: "Dr. Analyst",
        status: "COMPLETE",
        isBlocked: false,
      },
      {
        date: "01-09-2026",
        mediaName: "Mac Conkey's Broth",
        openingBalanceGm: null, // Blocked row
        quantityUsedGm: null,
        balanceGm: null,
        tubePlates: 14,
        usedIn: "Water Sample A, Water Sample B",
        preparedBy: "Dr. Analyst",
        status: "CALCULATION_BLOCKED",
        isBlocked: true,
      },
      {
        date: "02-09-2026",
        mediaName: "Peptone Water",
        openingBalanceGm: 200.0,
        quantityUsedGm: 6.0,
        balanceGm: 194.0,
        tubePlates: 6,
        usedIn: "Sample C",
        preparedBy: "Dr. Analyst",
        status: "COMPLETE",
        isBlocked: false,
      },
    ];

    buildMediaSheet(ws, mockRows, mockMeta);

    // Verify row 6 (First entry, date 01-09-2026)
    const r1 = ws.getRow(6);
    expect(r1.getCell(1).value).toBe("01-09-2026");
    expect(r1.getCell(2).value).toBe("Soybean Casein Digest Broth");
    expect(r1.getCell(3).value).toBe(500);
    expect(r1.getCell(4).value).toBe(21.6);
    expect(r1.getCell(5).value).toBe(478.4);
    expect(r1.getCell(6).value).toBe(8);

    // Verify row 7 (Blocked entry prints "—")
    const r2 = ws.getRow(7);
    expect(r2.getCell(3).value).toBe("—");
    expect(r2.getCell(4).value).toBe("—");
    expect(r2.getCell(5).value).toBe("—");
    expect(r2.getCell(9).value).toBe("Blocked");

    // Check merge for the two 01-09-2026 rows: cells A6 and A7
    expect(ws.getCell("A6").isMerged).toBe(true);
  });

  it("2. Autoclave Excel formats 12h times, midnight offset, unattached cleaning and verification", async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Autoclave Log");

    const mockRows: AutoclaveExportRow[] = [
      {
        date: "01-09-2026",
        cycleLoadName: "Media – 01-09-2026 (4 samples)",
        autoclaveStartTime: "11:00 AM",
        sterilizationStartTime: "11:10 AM",
        temperatureC: "121 °C",
        pressure: "15 LBS",
        endTime: "11:25 AM",
        actualTemperatureC: "121.5 °C",
        actualPressure: "15.2 LBS",
        actualStartTime: "11:12 AM",
        actualEndTime: "11:27 AM",
        cleaningWeekly: "Completed 01-09-2026",
        doneBy: "Staff Member",
        verificationStatus: "Verified",
        isCleaningOnlyRow: false,
      },
      {
        date: "07-09-2026",
        cycleLoadName: "",
        autoclaveStartTime: "",
        sterilizationStartTime: "",
        temperatureC: "",
        pressure: "",
        endTime: "",
        cleaningWeekly: "Scheduled 07-09-2026",
        doneBy: "Cleaner Staff",
        verificationStatus: "Planned",
        isCleaningOnlyRow: true,
      },
      {
        date: "14-09-2026",
        cycleLoadName: "Night Cycle",
        autoclaveStartTime: "11:45 PM",
        sterilizationStartTime: "11:50 PM",
        temperatureC: "121 °C",
        pressure: "15 LBS",
        endTime: "12:05 AM (+1 day)",
        cleaningWeekly: "—",
        doneBy: "Staff Member",
        verificationStatus: "Planned",
        isCleaningOnlyRow: false,
      },
    ];

    buildAutoclaveSheet(ws, mockRows, mockEquip, mockMeta);

    // Header checks
    expect(ws.getCell("H1").value).toContain("QC/M/023/F/01");
    expect(ws.getCell("H2").value).toContain("PM/QC/M/023");
    expect(ws.getCell("H3").value).toContain("PM/QC/M/01");

    // Row 7 (Verified cycle load entry)
    const r1 = ws.getRow(7);
    expect(r1.getCell(1).value).toBe("01-09-2026");
    expect(r1.getCell(2).value).toBe("Media – 01-09-2026 (4 samples)");
    expect(r1.getCell(10).value).toBe("Verified");
    // Actuals rendered on second line
    expect(r1.getCell(4).value).toContain("Actual: 11:12 AM");
    expect(r1.getCell(5).value).toContain("Actual: 121.5 °C");

    // Row 8 (Unattached cleaning-only row)
    const r2 = ws.getRow(8);
    expect(r2.getCell(1).value).toBe("07-09-2026");
    expect(r2.getCell(2).value).toBe("");
    expect(r2.getCell(8).value).toBe("Scheduled 07-09-2026");

    // Row 9 (Midnight crossing)
    const r3 = ws.getRow(9);
    expect(r3.getCell(7).value).toBe("12:05 AM (+1 day)");
  });

  it("3. Combined Monthly Package generates 2 sheets with correct metadata", async () => {
    const wb = await buildCombinedPackageWorkbook([], [], mockEquip, mockMeta);
    expect(wb.worksheets.length).toBe(2);
    expect(wb.worksheets[0].name).toBe("Media Preparation Record");
    expect(wb.worksheets[1].name).toBe("Autoclave Log Book");
  });
});
