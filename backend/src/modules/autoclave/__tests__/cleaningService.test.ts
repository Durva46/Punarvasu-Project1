/**
 * backend/src/modules/autoclave/__tests__/cleaningService.test.ts
 *
 * Unit and Scenario Tests for Autoclave Cleaning Service (Phase 6):
 * 1. Generate twice for a month -> idempotent, no duplicates, count unchanged.
 * 2. Completed rows survive rule change (never deleted or updated).
 * 3. Changing rule keeps past scheduled dates as overdue, removes future scheduled dates that no longer match.
 * 4. Completing with a future actual date relative to Asia/Kolkata is rejected.
 * 5. Double completion on the same entry returns 409 conflict.
 * 6. Reopen cleaning entry requires reason and resets to SCHEDULED.
 * 7. unattachedCleaning dates returned when cleaning dates do not match cycle entries.
 * 8. Summary returns accurate counts (scheduled, completed, overdue).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { AutoclaveCleaningService } from "../cleaningService";
import { prisma } from "../../../lib/prisma";

vi.mock("../../../lib/prisma", () => ({
  prisma: {
    autoclaveEquipment: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    autoclaveSetting: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    appSetting: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    autoclaveCleaningSchedule: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    profile: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("../../../lib/audit", () => ({
  recordAudit: vi.fn().mockResolvedValue({ id: "audit-1" }),
}));

describe("AutoclaveCleaningService Unit Tests (Phase 6)", () => {
  let service: AutoclaveCleaningService;

  beforeEach(() => {
    vi.restoreAllMocks();
    service = new AutoclaveCleaningService();
  });

  // 1. Generate twice for a month -> Idempotent
  it("generates cleaning dates idempotently without duplicate rows", async () => {
    const mockEquip = { id: "eq-1", name: "Vertical Autoclave", active: true };
    (prisma.autoclaveEquipment.findUnique as any).mockResolvedValue(mockEquip);
    (prisma.autoclaveEquipment.findFirst as any).mockResolvedValue(mockEquip);

    // Mock settings returning anchor=1, second=7, interval=7
    (prisma.autoclaveSetting.findMany as any).mockResolvedValue([
      { key: "cleaning_first_day", value: 1 },
      { key: "cleaning_second_day", value: 7 },
      { key: "cleaning_interval_days", value: 7 },
    ]);

    // First call: no existing rows
    (prisma.autoclaveCleaningSchedule.findMany as any).mockResolvedValue([]);
    (prisma.autoclaveCleaningSchedule.create as any).mockResolvedValue({ id: "clean-new" });

    const res1 = await service.generateSchedule("2026-09", "eq-1", "user-admin");
    expect(res1.createdCount).toBe(5); // 1, 7, 14, 21, 28
    expect(res1.keptCount).toBe(0);
    expect(prisma.autoclaveCleaningSchedule.create).toHaveBeenCalledTimes(5);

    // Second call: 5 rows already exist
    const existing = res1.dates.map((d, i) => ({
      id: `clean-${i}`,
      scheduledDate: new Date(d + "T00:00:00Z"),
      status: "SCHEDULED",
    }));
    (prisma.autoclaveCleaningSchedule.findMany as any).mockResolvedValue(existing);
    (prisma.autoclaveCleaningSchedule.create as any).mockClear();

    const res2 = await service.generateSchedule("2026-09", "eq-1", "user-admin");
    expect(res2.createdCount).toBe(0);
    expect(res2.keptCount).toBe(5);
    expect(prisma.autoclaveCleaningSchedule.create).not.toHaveBeenCalled();
  });

  // 2. Completed rows survive rule change
  it("preserves COMPLETED rows even when the rule changes", async () => {
    const mockEquip = { id: "eq-1", name: "Vertical Autoclave", active: true };
    (prisma.autoclaveEquipment.findUnique as any).mockResolvedValue(mockEquip);
    (prisma.autoclaveEquipment.findFirst as any).mockResolvedValue(mockEquip);

    // New rule: first=2, second=9, interval=7 -> 2026-09: 2, 9, 16, 23, 30
    (prisma.autoclaveSetting.findMany as any).mockResolvedValue([
      { key: "cleaning_first_day", value: 2 },
      { key: "cleaning_second_day", value: 9 },
      { key: "cleaning_interval_days", value: 7 },
    ]);

    // Existing rows had 2026-09-01 marked as COMPLETED
    const existing = [
      {
        id: "clean-01",
        scheduledDate: new Date("2026-09-01T00:00:00Z"),
        status: "COMPLETED",
      },
    ];
    (prisma.autoclaveCleaningSchedule.findMany as any).mockResolvedValue(existing);
    (prisma.autoclaveCleaningSchedule.delete as any).mockResolvedValue({});
    (prisma.autoclaveCleaningSchedule.create as any).mockResolvedValue({});

    const res = await service.generateSchedule("2026-09", "eq-1", "user-admin");
    expect(res.preservedCompletedCount).toBe(1);
    expect(prisma.autoclaveCleaningSchedule.delete).not.toHaveBeenCalledWith({
      where: { id: "clean-01" },
    });
  });

  // 3. Past scheduled kept as overdue, future scheduled removed on rule change
  it("keeps past scheduled rows as overdue and removes future scheduled rows when rule changes", async () => {
    const mockEquip = { id: "eq-1", name: "Vertical Autoclave", active: true };
    (prisma.autoclaveEquipment.findUnique as any).mockResolvedValue(mockEquip);
    (prisma.autoclaveEquipment.findFirst as any).mockResolvedValue(mockEquip);

    // Current rule produces: [2026-09-02, 2026-09-09, 2026-09-16, 2026-09-23, 2026-09-30]
    (prisma.autoclaveSetting.findMany as any).mockResolvedValue([
      { key: "cleaning_first_day", value: 2 },
      { key: "cleaning_second_day", value: 9 },
      { key: "cleaning_interval_days", value: 7 },
    ]);

    // Past date (e.g. 2020-01-01) scheduled row vs Future date (2099-01-01) scheduled row
    const existing = [
      {
        id: "clean-past",
        scheduledDate: new Date("2020-09-01T00:00:00Z"),
        status: "SCHEDULED",
      },
      {
        id: "clean-future",
        scheduledDate: new Date("2099-09-28T00:00:00Z"),
        status: "SCHEDULED",
      },
    ];
    (prisma.autoclaveCleaningSchedule.findMany as any).mockResolvedValue(existing);
    (prisma.autoclaveCleaningSchedule.delete as any).mockResolvedValue({});
    (prisma.autoclaveCleaningSchedule.create as any).mockResolvedValue({});

    const res = await service.generateSchedule("2026-09", "eq-1", "user-admin");
    // Past date kept in keptPastScheduled
    expect(res.keptPastScheduled).toContain("2020-09-01");
    // Future date deleted
    expect(prisma.autoclaveCleaningSchedule.delete).toHaveBeenCalledWith({
      where: { id: "clean-future" },
    });
  });

  // 4. Completing with a future actual date rejected
  it("rejects completion with a future actual date relative to IST", async () => {
    (prisma.autoclaveCleaningSchedule.findUnique as any).mockResolvedValue({
      id: "clean-1",
      status: "SCHEDULED",
    });

    await expect(
      service.completeCleaning(
        "clean-1",
        { actual_date: "2099-12-31" },
        { id: "u-1", role: "ANALYST" }
      )
    ).rejects.toThrow("Actual cleaning date cannot be in the future");
  });

  // 5. Double completion on the same entry returns 409 conflict
  it("rejects double completion on an already completed entry with 409 conflict", async () => {
    (prisma.autoclaveCleaningSchedule.findUnique as any).mockResolvedValue({
      id: "clean-1",
      status: "COMPLETED",
    });

    await expect(
      service.completeCleaning(
        "clean-1",
        { actual_date: "2026-09-01" },
        { id: "u-1", role: "ANALYST" }
      )
    ).rejects.toThrow("already marked as COMPLETED");
  });

  // 6. Reopen cleaning entry requires reason and resets to SCHEDULED
  it("reopens a completed cleaning entry when a valid reason is provided", async () => {
    (prisma.autoclaveCleaningSchedule.findUnique as any).mockResolvedValue({
      id: "clean-1",
      status: "COMPLETED",
      actualDate: new Date("2026-09-01"),
      doneById: "u-1",
    });
    (prisma.autoclaveCleaningSchedule.update as any).mockResolvedValue({
      id: "clean-1",
      status: "SCHEDULED",
      actualDate: null,
      doneById: null,
    });

    // Empty reason throws
    await expect(
      service.reopenCleaning("clean-1", "", { id: "admin-1", role: "ADMIN" })
    ).rejects.toThrow("Reason is required");

    // Valid reason updates to SCHEDULED
    const reopened = await service.reopenCleaning("clean-1", "Entered wrong date", {
      id: "admin-1",
      role: "ADMIN",
    });
    expect(reopened.status).toBe("SCHEDULED");
    expect(prisma.autoclaveCleaningSchedule.update).toHaveBeenCalledWith({
      where: { id: "clean-1" },
      data: {
        status: "SCHEDULED",
        actualDate: null,
        doneById: null,
        completedAt: null,
      },
    });
  });

  // 7. listSchedule calculates display status and counts correctly
  it("calculates SCHEDULED, COMPLETED, and OVERDUE counts properly in listSchedule", async () => {
    const mockRows = [
      {
        id: "c-1",
        equipmentId: "eq-1",
        scheduledDate: new Date("2020-01-01T00:00:00Z"), // Past date, scheduled -> OVERDUE
        status: "SCHEDULED",
        actualDate: null,
        doneBy: null,
      },
      {
        id: "c-2",
        equipmentId: "eq-1",
        scheduledDate: new Date("2020-01-07T00:00:00Z"),
        status: "COMPLETED",
        actualDate: new Date("2020-01-07T00:00:00Z"),
        doneBy: { fullName: "Dr. Analyst" },
      },
      {
        id: "c-3",
        equipmentId: "eq-1",
        scheduledDate: new Date("2099-01-14T00:00:00Z"), // Future date, scheduled -> SCHEDULED
        status: "SCHEDULED",
        actualDate: null,
        doneBy: null,
      },
    ];

    (prisma.autoclaveCleaningSchedule.findMany as any).mockResolvedValue(mockRows);

    const result = await service.listSchedule("2026-09", "eq-1");
    expect(result.total).toBe(3);
    expect(result.completedCount).toBe(1);
    expect(result.overdueCount).toBe(1);
    expect(result.scheduledCount).toBe(1);
    expect(result.rows[0].statusDisplay).toBe("OVERDUE");
    expect(result.rows[1].statusDisplay).toBe("COMPLETED");
    expect(result.rows[2].statusDisplay).toBe("SCHEDULED");
  });
});
