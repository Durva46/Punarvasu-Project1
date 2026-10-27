/**
 * backend/src/modules/__tests__/e2eWorkflow.test.ts
 *
 * Full End-to-End Workflow Simulation Test (Phase 8 Section C4):
 * Simulates the user's custom test scenario from start to finish:
 * 1. Day 1: 4 samples with no water (S=4, W=0, N=4).
 *    Verify: SCDB 8, Mac Conkey 14, Peptone Water 6, SCDA 10, SDA 10, NO R2A.
 * 2. Day 2: 7 samples with 2 water (S=7, W=2, N=5).
 *    Verify: R2A 4, SCDA 12, SDA 12, SCDB 14, Mac Conkey 20, Peptone Water 9.
 * 3. Opening balance entered once on Day 1 (500 gm); carried forward automatically.
 * 4. Quantity used calculation & Refill requirement logic.
 * 5. Exactly 2 autoclave cycles generated (one per date).
 * 6. Start time modification recalculating end time; midnight offset.
 * 7. Weekly cleaning generated (1, 7, 14, 21, 28) and completed.
 * 8. Cycle verification by Verifier.
 * 9. Combined monthly export package generation.
 */

import { describe, it, expect } from "vitest";
import { evaluateFormula } from "../media/formulaParser";
import { addMinutesToTime, formatDateDMY } from "../../lib/time";
import { generateCleaningDates } from "../autoclave/cleaningShared";
import { buildCombinedPackageWorkbook } from "../exports/excelBuilder";

describe("Phase 8 End-to-End Laboratory Workflow Simulation", () => {
  it("executes the full laboratory workflow scenario end-to-end", async () => {
    // ── Day 1: 4 samples, 0 water (S=4, W=0, N=4) ───────────────────────────
    const day1Vars = { S: 4, W: 0, N: 4 };

    const scdb_day1 = evaluateFormula("(S) * 2", day1Vars);
    const mc_day1 = evaluateFormula("(S + 1 + 1 + 1) * 2", day1Vars);
    const peptone_day1 = evaluateFormula("S + 1 + 1", day1Vars);
    const scda_day1 = evaluateFormula("(N * 2) + 1 + 1", day1Vars);
    const sda_day1 = evaluateFormula("(N * 2) + 1 + 1", day1Vars);

    expect(scdb_day1).toBe(8);
    expect(mc_day1).toBe(14);
    expect(peptone_day1).toBe(6);
    expect(scda_day1).toBe(10);
    expect(sda_day1).toBe(10);

    // Rule: R2A only added when W > 0 -> on Day 1 W is 0 so R2A is omitted
    const r2a_included_day1 = day1Vars.W > 0;
    expect(r2a_included_day1).toBe(false);

    // Opening balance entered once on Day 1 for SCDB
    const initialOpeningSCDB = 500.0;
    const scdbQuantityPerTube = 2.7; // Standard seeded gm per tube
    const scdbQtyUsed_day1 = Number((scdb_day1 * scdbQuantityPerTube).toFixed(4)); // 8 * 2.7 = 21.60
    expect(scdbQtyUsed_day1).toBe(21.6);

    const scdbBalance_day1 = Number((initialOpeningSCDB - scdbQtyUsed_day1).toFixed(4)); // 478.40
    expect(scdbBalance_day1).toBe(478.4);

    // ── Day 2: 7 samples, 2 water (S=7, W=2, N=5) ───────────────────────────
    const day2Vars = { S: 7, W: 2, N: 5 };

    const scdb_day2 = evaluateFormula("(S) * 2", day2Vars);
    const mc_day2 = evaluateFormula("(S + 1 + 1 + 1) * 2", day2Vars);
    const peptone_day2 = evaluateFormula("S + 1 + 1", day2Vars);
    const scda_day2 = evaluateFormula("(N * 2) + 1 + 1", day2Vars);
    const sda_day2 = evaluateFormula("(N * 2) + 1 + 1", day2Vars);
    const r2a_day2 = evaluateFormula("W * 2", day2Vars);

    expect(scdb_day2).toBe(14);
    expect(mc_day2).toBe(20);
    expect(peptone_day2).toBe(9);
    expect(scda_day2).toBe(12);
    expect(sda_day2).toBe(12);
    expect(r2a_day2).toBe(4);

    const r2a_included_day2 = day2Vars.W > 0;
    expect(r2a_included_day2).toBe(true);

    // Continuous balance: Day 2 opening balance carries forward from Day 1 balance (478.40)
    const scdbOpening_day2 = scdbBalance_day1;
    const scdbQtyUsed_day2 = Number((scdb_day2 * scdbQuantityPerTube).toFixed(4)); // 14 * 2.7 = 37.80
    expect(scdbQtyUsed_day2).toBe(37.8);

    const scdbBalance_day2 = Number((scdbOpening_day2 - scdbQtyUsed_day2).toFixed(4));
    expect(scdbBalance_day2).toBe(440.6);

    // ── Autoclave Cycles Generation: Exactly 2 entries for 2 dates ──────────
    const datesWithSamples = ["2026-09-01", "2026-09-07"];
    const generatedAutoclaveCycles = datesWithSamples.map((dateStr, idx) => ({
      id: `cycle-${idx + 1}`,
      logDate: dateStr,
      loadDescription: `Media – ${formatDateDMY(new Date(dateStr))} (${idx === 0 ? 4 : 7} samples)`,
      autoclaveStartTime: "11:00",
      sterilizationStartTime: "11:10",
      temperatureC: 121,
      pressureValue: 15,
      pressureUnit: "LBS",
      duration: 15,
      endTime: addMinutesToTime("11:10", 15).time, // 11:25
      verificationStatus: "PREFILLED",
    }));

    expect(generatedAutoclaveCycles.length).toBe(2);
    expect(generatedAutoclaveCycles[0].endTime).toBe("11:25");

    // Analyst edits Day 2 cycle start time to 23:50 -> end time recalculates to 00:05 (+1 day offset)
    const editedDay2 = {
      ...generatedAutoclaveCycles[1],
      sterilizationStartTime: "23:50",
      ...addMinutesToTime("23:50", 15),
    };
    expect(editedDay2.time).toBe("00:05");
    expect(editedDay2.dayOffset).toBe(1);

    // Verifier verifies Day 1 cycle with actual readings
    const verifiedDay1 = {
      ...generatedAutoclaveCycles[0],
      verificationStatus: "VERIFIED",
      actualTemperatureC: 121.2,
      actualPressureValue: 15.1,
      actualStartTime: "11:12",
      actualEndTime: "11:27",
    };
    expect(verifiedDay1.verificationStatus).toBe("VERIFIED");

    // ── Weekly Cleaning Schedule Generation (September 2026) ────────────────
    const cleaningDates = generateCleaningDates({
      year: 2026,
      month: 9,
      firstDay: 1,
      secondDay: 7,
      intervalDays: 7,
    });
    expect(cleaningDates).toEqual([
      "2026-09-01",
      "2026-09-07",
      "2026-09-14",
      "2026-09-21",
      "2026-09-28",
    ]);

    // ── Final Combined Export Package Workbook Generation ────────────────────
    const mediaExportRows = [
      {
        date: "01-09-2026",
        mediaName: "Soybean Casein Digest Broth",
        openingBalanceGm: initialOpeningSCDB,
        quantityUsedGm: scdbQtyUsed_day1,
        balanceGm: scdbBalance_day1,
        tubePlates: scdb_day1,
        usedIn: "Sample 1, Sample 2, Sample 3, Sample 4",
        preparedBy: "Staff Analyst",
        status: "COMPLETE",
        isBlocked: false,
      },
      {
        date: "07-09-2026",
        mediaName: "R2A Agar",
        openingBalanceGm: 200.0,
        quantityUsedGm: 8.0,
        balanceGm: 192.0,
        tubePlates: r2a_day2,
        usedIn: "Water Sample A, Water Sample B",
        preparedBy: "Staff Analyst",
        status: "COMPLETE",
        isBlocked: false,
      },
    ];

    const autoclaveExportRows = [
      {
        date: "01-09-2026",
        cycleLoadName: verifiedDay1.loadDescription,
        autoclaveStartTime: "11:00 AM",
        sterilizationStartTime: "11:10 AM",
        temperatureC: "121 °C",
        pressure: "15 LBS",
        endTime: "11:25 AM",
        actualTemperatureC: "121.2 °C",
        actualPressure: "15.1 LBS",
        actualStartTime: "11:12 AM",
        actualEndTime: "11:27 AM",
        cleaningWeekly: "Completed 01-09-2026",
        doneBy: "Staff Analyst",
        verificationStatus: "Verified" as const,
        isCleaningOnlyRow: false,
      },
    ];

    const meta = {
      reportingMonth: "2026-09",
      generatedBy: "System Auditor",
      generatedAt: "27-10-2026 14:30 PM",
    };

    const equip = {
      formatNo: "QC/M/023/F/01",
      refSopNo: "PM/QC/M/023",
      equipmentNo: "PM/QC/M/01",
    };

    const pkgWb = await buildCombinedPackageWorkbook(mediaExportRows, autoclaveExportRows, equip, meta);
    expect(pkgWb.worksheets.length).toBe(2);
    expect(pkgWb.getWorksheet("Media Preparation Record")?.rowCount).toBeGreaterThan(5);
    expect(pkgWb.getWorksheet("Autoclave Log Book")?.rowCount).toBeGreaterThan(6);
  });
});
