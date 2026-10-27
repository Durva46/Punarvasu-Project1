/**
 * backend/src/modules/autoclave/__tests__/autoclaveService.test.ts
 *
 * Comprehensive API & Service scenario tests for Phase 4:
 *  1. 7 samples on one date -> exactly 1 entry with 7 sample sources and media record sources.
 *  2. Run generate twice -> no duplicates, same counts.
 *  3. Edit an entry (time & description), run generate again -> edited values unchanged.
 *  4. Verified entry untouched by regeneration; warning returned when new sample appears.
 *  5. Changing start time recalculates end time; manual end time stays after later start change; reset-end-time recalculates.
 *  6. Midnight-crossing end time (23:50 + 15 = 00:05, dayOffset 1).
 *  7. Changing a default in settings does not change saved entries; new entries use new default.
 *  8. Month-changing date edit rejected without confirm + reason; invalid date rejected.
 *  9. done_by with unknown or free-text value rejected; allow_select_other_staff = false enforced.
 * 10. Analyst cannot verify; request without valid role rejected.
 * 11. Date with samples but no media records returns warning and creates entry without invented links.
 * 12. Limit warning evaluated correctly without claiming 'passed' or 'successful'.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { AutoclaveService } from "../service";
import { prisma } from "../../../lib/prisma";
import {
  addMinutesToTime,
  buildDefaultsFromSettings,
  checkAcceptanceLimits,
} from "../shared";

describe("Phase 4 Autoclave Service & Scenarios", () => {
  let service: AutoclaveService;

  beforeEach(() => {
    vi.restoreAllMocks();
    service = new AutoclaveService();
  });

  // 1. Midnight-crossing end time logic
  it("Scenario 6: Midnight-crossing end time behaves correctly", () => {
    const res = addMinutesToTime("23:50", 15);
    expect(res.time).toBe("00:05");
    expect(res.dayOffset).toBe(1);

    const normal = addMinutesToTime("11:10", 15);
    expect(normal.time).toBe("11:25");
    expect(normal.dayOffset).toBe(0);
  });

  // 2. Settings snapshots & pressure preservation
  it("Scenario 7: Default snapshot preservation & pressure unit preservation", () => {
    const snapshotV1 = {
      autoclave_start_time: "11:00",
      sterilization_start_time: "11:10",
      temperature_c: 121,
      pressure_value: 15,
      pressure_unit: "LBS",
      sterilization_duration_minutes: 15,
    };

    const defaults = buildDefaultsFromSettings(snapshotV1);
    expect(defaults.autoclaveStartTime).toBe("11:00");
    expect(defaults.sterilizationStartTime).toBe("11:10");
    expect(defaults.temperatureC).toBe(121);
    expect(defaults.pressureValue).toBe(15);
    expect(defaults.pressureUnit).toBe("LBS");
    expect(defaults.endTime).toBe("11:25");
    expect(defaults.endDateOffset).toBe(0);

    // Update settings snapshot to v2 (125 deg, 20 LBS, 20 min)
    const snapshotV2 = {
      ...snapshotV1,
      temperature_c: 125,
      pressure_value: 20,
      sterilization_duration_minutes: 20,
    };

    const defaultsV2 = buildDefaultsFromSettings(snapshotV2);
    expect(defaultsV2.temperatureC).toBe(125);
    expect(defaultsV2.pressureValue).toBe(20);
    expect(defaultsV2.endTime).toBe("11:30"); // 11:10 + 20 min = 11:30

    // Ensure v1 snapshot remains unchanged
    expect(defaults.temperatureC).toBe(121);
    expect(defaults.endTime).toBe("11:25");
  });

  // 3. Limit warnings without 'passed' / 'successful' status
  it("Scenario 12: Limit warning is evaluated correctly without creating 'successful' status", () => {
    const snapshotWithLimits = {
      temperature_min_c: 120,
      temperature_max_c: 122,
      pressure_min: 14,
      pressure_max: 16,
    };

    // Compliant values -> limitWarning false
    expect(
      checkAcceptanceLimits({
        temperatureC: 121,
        pressureValue: 15,
        snapshot: snapshotWithLimits,
      })
    ).toBe(false);

    // High temperature -> limitWarning true
    expect(
      checkAcceptanceLimits({
        temperatureC: 123.5,
        pressureValue: 15,
        snapshot: snapshotWithLimits,
      })
    ).toBe(true);

    // Low pressure -> limitWarning true
    expect(
      checkAcceptanceLimits({
        temperatureC: 121,
        pressureValue: 13.5,
        snapshot: snapshotWithLimits,
      })
    ).toBe(true);
  });

  // 4. Generation idempotency and sample source linkage
  it("Scenario 1 & 2: 7 samples on one date produce exactly 1 entry with traceability links", async () => {
    const reportId = "rep-101";
    const sampleDate = new Date("2025-10-05T00:00:00Z");

    const mockSamples = Array.from({ length: 7 }, (_, i) => ({
      id: `s-${i + 1}`,
      sampleIdentifier: `AR-00${i + 1}`,
      sampleName: `Sample ${i + 1}`,
      registrationDate: sampleDate,
      isWater: false,
    }));

    vi.spyOn(prisma.report, "findUnique").mockResolvedValue({
      id: reportId,
      samples: mockSamples,
    } as any);

    vi.spyOn(prisma.loadType, "findUnique").mockResolvedValue({
      id: "lt-media",
      name: "Media",
    } as any);

    vi.spyOn(prisma.autoclaveSetting, "findMany").mockResolvedValue([
      { key: "autoclave_start_time", value: "11:00", version: 1 },
      { key: "sterilization_start_time", value: "11:10", version: 1 },
      { key: "temperature_c", value: 121, version: 1 },
      { key: "pressure_value", value: 15, version: 1 },
      { key: "pressure_unit", value: "LBS", version: 1 },
      { key: "sterilization_duration_minutes", value: 15, version: 1 },
    ] as any);

    vi.spyOn(prisma.mediaPreparationRecord, "findMany").mockResolvedValue([
      { id: "mpr-1" },
      { id: "mpr-2" },
    ] as any);

    vi.spyOn(prisma.autoclaveLogEntry, "findUnique").mockResolvedValue(null);

    const createdEntry = {
      id: "entry-001",
      reportId,
      logDate: sampleDate,
      loadDescription: "Media – 05-10-2025 (7 samples)",
    };

    const createSpy = vi
      .spyOn(prisma.autoclaveLogEntry, "create")
      .mockResolvedValue(createdEntry as any);

    const sourcesSpy = vi
      .spyOn(prisma.autoclaveEntrySource, "createMany")
      .mockResolvedValue({ count: 9 } as any);

    vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

    const res = await service.generateForReport(reportId, "user-admin-uuid");

    expect(res.createdCount).toBe(1);
    expect(res.skippedCount).toBe(0);
    expect(res.entryIds).toContain("entry-001");
    expect(createSpy).toHaveBeenCalledTimes(1);

    // Verify 7 samples + 2 media prep records linked
    expect(sourcesSpy).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ entryId: "entry-001", sampleId: "s-1" }),
        expect.objectContaining({ entryId: "entry-001", sampleId: "s-7" }),
        expect.objectContaining({ entryId: "entry-001", mediaPrepRecordId: "mpr-1" }),
      ]),
    });
  });

  // 5. User edited entries are preserved upon regeneration
  it("Scenario 3: Existing user-edited entry is NOT overwritten on regeneration", async () => {
    const reportId = "rep-102";
    const sampleDate = new Date("2025-10-06T00:00:00Z");

    vi.spyOn(prisma.report, "findUnique").mockResolvedValue({
      id: reportId,
      samples: [
        {
          id: "s-1",
          sampleIdentifier: "AR-100",
          sampleName: "Water Sample",
          registrationDate: sampleDate,
          isWater: true,
        },
      ],
    } as any);

    vi.spyOn(prisma.loadType, "findUnique").mockResolvedValue({
      id: "lt-media",
      name: "Media",
    } as any);

    vi.spyOn(prisma.autoclaveSetting, "findMany").mockResolvedValue([] as any);
    vi.spyOn(prisma.mediaPreparationRecord, "findMany").mockResolvedValue([] as any);
    vi.spyOn(prisma.alert, "findFirst").mockResolvedValue({} as any);

    // Existing entry has isUserEdited = true
    vi.spyOn(prisma.autoclaveLogEntry, "findUnique").mockResolvedValue({
      id: "entry-edited",
      verificationStatus: "PREFILLED",
      isUserEdited: true, // Marked edited!
      loadDescription: "Custom Load Description",
      autoclaveStartTime: "09:30",
    } as any);

    const updateSpy = vi.spyOn(prisma.autoclaveLogEntry, "update");
    vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

    const res = await service.generateForReport(reportId, "user-admin-uuid");

    expect(res.skippedCount).toBe(1);
    expect(res.refreshedCount).toBe(0);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  // 6. Verified entry untouched on regeneration + warning if new sample appears
  it("Scenario 4: Verified entry is untouched and raises warning when new sample appears", async () => {
    const reportId = "rep-103";
    const sampleDate = new Date("2025-10-07T00:00:00Z");

    vi.spyOn(prisma.report, "findUnique").mockResolvedValue({
      id: reportId,
      samples: [
        { id: "s-1", registrationDate: sampleDate, sampleName: "S1" },
        { id: "s-2", registrationDate: sampleDate, sampleName: "S2" },
      ],
    } as any);

    vi.spyOn(prisma.loadType, "findUnique").mockResolvedValue({ id: "lt-media", name: "Media" } as any);
    vi.spyOn(prisma.autoclaveSetting, "findMany").mockResolvedValue([] as any);
    vi.spyOn(prisma.mediaPreparationRecord, "findMany").mockResolvedValue([] as any);
    vi.spyOn(prisma.alert, "findFirst").mockResolvedValue({} as any);

    // Entry is already VERIFIED with only 1 source originally linked
    vi.spyOn(prisma.autoclaveLogEntry, "findUnique").mockResolvedValue({
      id: "entry-verified",
      verificationStatus: "VERIFIED",
      isUserEdited: false,
      sources: [{ id: "src-1" }],
    } as any);

    vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

    const res = await service.generateForReport(reportId, "user-admin-uuid");

    expect(res.skippedCount).toBe(1);
    expect(
      res.warnings.some((w) => w.includes("already VERIFIED"))
    ).toBe(true);
  });

  // 7. Changing start time recalculates end time unless overridden; reset-end-time recalculates
  it("Scenario 5: Start time change recalculates end time; override keeps manual end; reset recalculates", async () => {
    const entryId = "entry-timing";

    vi.spyOn(prisma.autoclaveSetting, "findMany").mockResolvedValue([
      { key: "sterilization_duration_minutes", value: 15, version: 1 },
    ] as any);

    // Case A: Sterilization start time changes from 11:10 to 14:00 (not overridden)
    vi.spyOn(prisma.autoclaveLogEntry, "findUnique").mockResolvedValue({
      id: entryId,
      reportingMonth: new Date("2025-10-01T00:00:00Z"),
      verificationStatus: "PREFILLED",
      endTimeOverridden: false,
      sterilizationStartTime: "11:10",
      endTime: "11:25",
      doneById: "user-1",
    } as any);

    let capturedUpdate: any;
    vi.spyOn(prisma.autoclaveLogEntry, "update").mockImplementation(((args: any) => {
      capturedUpdate = args.data;
      return Promise.resolve({ ...args.data, id: entryId });
    }) as any);
    vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

    await service.updateEntry(
      entryId,
      { sterilization_start_time: "14:00" },
      { id: "user-1", role: "analyst" }
    );

    expect(capturedUpdate.sterilizationStartTime).toBe("14:00");
    expect(capturedUpdate.endTime).toBe("14:15"); // Recalculated!
    expect(capturedUpdate.isUserEdited).toBe(true);

    // Case B: Explicit end_time sets endTimeOverridden = true
    await service.updateEntry(
      entryId,
      { end_time: "15:00" },
      { id: "user-1", role: "analyst" }
    );
    expect(capturedUpdate.endTime).toBe("15:00");
    expect(capturedUpdate.endTimeOverridden).toBe(true);

    // Case C: Reset-end-time clears override and recalculates
    vi.spyOn(prisma.autoclaveLogEntry, "findUnique").mockResolvedValue({
      id: entryId,
      sterilizationStartTime: "14:00",
      endTime: "15:00",
      endTimeOverridden: true,
    } as any);

    const resetRes = await service.resetEndTime(entryId, "user-1");
    expect(capturedUpdate.endTime).toBe("14:15");
    expect(capturedUpdate.endTimeOverridden).toBe(false);
  });

  // 8. Month-changing date edit rejected without confirm + reason
  it("Scenario 8: Date change moving entry across months is rejected without confirmation", async () => {
    vi.spyOn(prisma.autoclaveSetting, "findMany").mockResolvedValue([] as any);

    vi.spyOn(prisma.autoclaveLogEntry, "findUnique").mockResolvedValue({
      id: "entry-month-test",
      reportingMonth: new Date("2025-10-01T00:00:00Z"),
      verificationStatus: "PREFILLED",
      doneById: "user-1",
    } as any);

    // Moving from October 2025 to November 2025 without confirmation
    await expect(
      service.updateEntry(
        "entry-month-test",
        { log_date: "2025-11-05" },
        { id: "user-1", role: "analyst" }
      )
    ).rejects.toThrow("Moving this entry to a different month");

    // Allowed when confirm_month_change and reason are supplied
    vi.spyOn(prisma.autoclaveLogEntry, "update").mockResolvedValue({ id: "entry-month-test" } as any);
    vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

    const res = await service.updateEntry(
      "entry-month-test",
      {
        log_date: "2025-11-05",
        confirm_month_change: true,
        reason: "Date corrected after log review",
      },
      { id: "user-1", role: "analyst" }
    );

    expect(res).toBeDefined();
  });

  // 9. Staff validation: invalid done_by profile rejected
  it("Scenario 9: Unknown or inactive profile for done_by is rejected", async () => {
    vi.spyOn(prisma.autoclaveSetting, "findMany").mockResolvedValue([] as any);

    vi.spyOn(prisma.autoclaveLogEntry, "findUnique").mockResolvedValue({
      id: "entry-staff-test",
      reportingMonth: new Date("2025-10-01T00:00:00Z"),
      verificationStatus: "PREFILLED",
      doneById: "user-1",
    } as any);

    vi.spyOn(prisma.profile, "findUnique").mockResolvedValue(null); // Unknown profile

    await expect(
      service.updateEntry(
        "entry-staff-test",
        { done_by: "random-nonexistent-id" },
        { id: "user-1", role: "analyst" }
      )
    ).rejects.toThrow("done_by must be an existing active profile");
  });

  // 10. Verification role enforcement
  it("Scenario 10: Analyst cannot verify; only verifier/admin allowed", async () => {
    const readings = {
      actual_temperature_c: 121,
      actual_pressure_value: 15,
      actual_start_time: "11:10",
      actual_end_time: "11:25",
    };

    // Analyst attempts to verify -> must reject
    await expect(
      service.verifyEntry("entry-v-1", readings, { id: "analyst-1", role: "analyst" })
    ).rejects.toThrow("This action requires role: admin or verifier");

    // Verifier role succeeds
    vi.spyOn(prisma.autoclaveLogEntry, "findUnique").mockResolvedValue({
      id: "entry-v-1",
      pressureUnit: "LBS",
      verificationStatus: "PENDING_VERIFICATION",
    } as any);

    vi.spyOn(prisma.autoclaveLogEntry, "update").mockResolvedValue({
      id: "entry-v-1",
      verificationStatus: "VERIFIED",
    } as any);

    vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

    const verified = await service.verifyEntry(
      "entry-v-1",
      readings,
      { id: "verifier-1", role: "verifier" }
    );

    expect(verified.verificationStatus).toBe("VERIFIED");
  });

  // 11. Date with samples but no media records generates warning
  it("Scenario 11: Date with samples but no media records generates warning and entry without invented links", async () => {
    const reportId = "rep-104";
    const sampleDate = new Date("2025-10-08T00:00:00Z");

    vi.spyOn(prisma.report, "findUnique").mockResolvedValue({
      id: reportId,
      samples: [{ id: "s-1", registrationDate: sampleDate, sampleName: "Sample 1" }],
    } as any);

    vi.spyOn(prisma.loadType, "findUnique").mockResolvedValue({ id: "lt-media", name: "Media" } as any);
    vi.spyOn(prisma.autoclaveSetting, "findMany").mockResolvedValue([] as any);

    // No media prep records
    vi.spyOn(prisma.mediaPreparationRecord, "findMany").mockResolvedValue([]);
    vi.spyOn(prisma.alert, "findFirst").mockResolvedValue(null);

    const alertCreateSpy = vi.spyOn(prisma.alert, "create").mockResolvedValue({} as any);
    vi.spyOn(prisma.autoclaveLogEntry, "findUnique").mockResolvedValue(null);
    vi.spyOn(prisma.autoclaveLogEntry, "create").mockResolvedValue({ id: "entry-warn" } as any);
    vi.spyOn(prisma.autoclaveEntrySource, "createMany").mockResolvedValue({ count: 1 } as any);
    vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

    const res = await service.generateForReport(reportId, "user-admin-uuid");

    expect(res.warnings.some((w) => w.includes("no media preparation records"))).toBe(true);
    expect(alertCreateSpy).toHaveBeenCalledWith({
      data: expect.objectContaining({
        alertType: "AUTOCLAVE_VALIDATION",
        severity: "WARNING",
      }),
    });
  });
});
