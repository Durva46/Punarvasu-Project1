/**
 * backend/src/modules/exports/__tests__/exportService.test.ts
 *
 * Unit and Scenario Tests for Export Service (Phase 7):
 * 1. Missing or invalid month validation.
 * 2. Final review returns proper checklist categories and counts.
 * 3. Empty month triggers 404 Err.notFound.
 * 4. Export logging inserts record in exportLog.
 * 5. deliverExport falls back to direct delivery for small files.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ExportService } from "../service";
import { prisma } from "../../../lib/prisma";

vi.mock("../../../lib/prisma", () => ({
  prisma: {
    report: {
      findFirst: vi.fn(),
    },
    sample: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    mediaPreparationRecord: {
      findMany: vi.fn(),
    },
    autoclaveLogEntry: {
      findMany: vi.fn(),
    },
    autoclaveCleaningSchedule: {
      findMany: vi.fn(),
    },
    autoclaveEquipment: {
      findFirst: vi.fn(),
    },
    exportLog: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe("ExportService Phase 7 Unit Tests", () => {
  let service: ExportService;

  beforeEach(() => {
    vi.restoreAllMocks();
    service = new ExportService();
  });

  it("1. Rejects invalid month format", async () => {
    await expect(service.getFinalReviewSummary("invalid-month")).rejects.toThrow(
      "month must be formatted as YYYY-MM"
    );
  });

  it("2. Returns complete final review checklist and counts", async () => {
    (prisma.report.findFirst as any).mockResolvedValue({
      id: "rep-1",
      reportingMonth: "2026-09",
      _count: {
        samples: 10,
        alerts: 1,
        autoclaveLogEntries: 5,
      },
    });

    (prisma.sample.count as any).mockResolvedValue(10);
    (prisma.sample.findMany as any).mockResolvedValue([
      { registrationDate: new Date("2026-09-01") },
      { registrationDate: new Date("2026-09-02") },
    ]);

    (prisma.mediaPreparationRecord.findMany as any).mockResolvedValue([
      { prepDate: new Date("2026-09-01"), status: "COMPLETE" },
    ]);

    (prisma.autoclaveLogEntry.findMany as any).mockResolvedValue([
      { verificationStatus: "VERIFIED" },
      { verificationStatus: "PENDING_VERIFICATION" },
    ]);

    (prisma.autoclaveCleaningSchedule.findMany as any).mockResolvedValue([
      { scheduledDate: new Date("2026-09-01"), status: "COMPLETED" },
      { scheduledDate: new Date("2026-09-07"), status: "SCHEDULED" },
    ]);

    const review = await service.getFinalReviewSummary("2026-09");
    expect(review.reportingMonth).toBe("2026-09");
    expect(review.canDownload).toBe(true);
    expect(review.checklist.length).toBe(6);
    expect(review.counts.samplesTotal).toBe(10);
    expect(review.counts.autoclavePendingVerification).toBe(1);
    expect(review.counts.autoclaveVerified).toBe(1);
    expect(review.hasIncompleteItems).toBe(true); // alertsOpen = 1 & pending = 1
  });

  it("3. Throws 404 when generating exports for month with no data", async () => {
    (prisma.mediaPreparationRecord.findMany as any).mockResolvedValue([]);
    await expect(
      service.generateExcel("2026-09", "media", { id: "u-1", fullName: "User" })
    ).rejects.toThrow("Nothing to export for this month yet");
  });

  it("4. Creates exportLog record on logExport call", async () => {
    (prisma.report.findFirst as any).mockResolvedValue({ id: "rep-1" });
    (prisma.exportLog.create as any).mockResolvedValue({ id: "log-1" });

    await service.logExport("MEDIA_XLSX", "2026-09", { id: "u-1", fullName: "User" });
    expect(prisma.exportLog.create).toHaveBeenCalledWith({
      data: {
        reportId: "rep-1",
        exportType: "MEDIA_XLSX",
        exportedById: "u-1",
      },
    });
  });

  it("5. Deliver export delivers small buffer directly", async () => {
    const smallBuffer = Buffer.from("test-content");
    const res = await service.deliverExport(smallBuffer, "test.xlsx", "application/vnd.ms-excel");
    expect(res.direct).toBe(true);
    expect(res.buffer).toEqual(smallBuffer);
  });
});
