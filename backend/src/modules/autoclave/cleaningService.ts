/**
 * backend/src/modules/autoclave/cleaningService.ts
 *
 * Weekly Cleaning Schedule Service (Phase 6).
 * Manages generation, listing, completion, and reopening of cleaning records.
 * Tracks cleaning completely separately from sterilization cycle completion.
 */

import { prisma } from "../../lib/prisma";
import { recordAudit } from "../../lib/audit";
import { Err } from "../../lib/errors";
import { formatDateDMY } from "../../lib/time";
import {
  generateCleaningDates,
  getTodayInKolkata,
  computeCleaningStatusDisplay,
} from "./cleaningShared";
import { AutoclaveService } from "./service";

export class AutoclaveCleaningService {
  private autoclaveService = new AutoclaveService();

  /**
   * 1. POST /api/autoclave/cleaning/generate { month (YYYY-MM), equipment_id? }
   */
  async generateSchedule(monthStr: string, equipmentId?: string, adminId?: string) {
    if (!/^\d{4}-\d{2}$/.test(monthStr)) {
      throw Err.validation("month must be formatted as YYYY-MM");
    }

    const [year, month] = monthStr.split("-").map(Number);
    const reportingMonth = new Date(Date.UTC(year, month - 1, 1));

    // Resolve equipment
    let equipment = null;
    if (equipmentId) {
      equipment = await prisma.autoclaveEquipment.findUnique({ where: { id: equipmentId } });
    } else {
      equipment = await prisma.autoclaveEquipment.findFirst({ where: { active: true } });
    }
    if (!equipment) {
      throw Err.notFound("AutoclaveEquipment");
    }

    // Get current cleaning settings rule
    const snapshot = await this.autoclaveService.getLatestSettingsSnapshot();
    const firstDay = Number(snapshot.cleaning_first_day ?? 1);
    const secondDay = Number(snapshot.cleaning_second_day ?? 7);
    const intervalDays = Number(snapshot.cleaning_interval_days ?? 7);

    // Compute expected date strings YYYY-MM-DD
    const targetDates = generateCleaningDates({
      year,
      month,
      firstDay,
      secondDay,
      intervalDays,
    });

    const { dateStr: todayIstStr } = getTodayInKolkata();

    // Fetch existing schedule rows for this equipment and reporting month
    const existingRows = await prisma.autoclaveCleaningSchedule.findMany({
      where: {
        equipmentId: equipment.id,
        reportingMonth,
      },
    });

    const existingMap = new Map<string, typeof existingRows[0]>();
    for (const r of existingRows) {
      existingMap.set(r.scheduledDate.toISOString().slice(0, 10), r);
    }

    let createdCount = 0;
    let keptCount = 0;
    let removedCount = 0;
    let preservedCompletedCount = 0;
    const keptPastScheduled: string[] = [];

    // 1. Process target dates (Insert missing as SCHEDULED)
    for (const dateStr of targetDates) {
      const existing = existingMap.get(dateStr);
      if (!existing) {
        await prisma.autoclaveCleaningSchedule.create({
          data: {
            equipmentId: equipment.id,
            reportingMonth,
            scheduledDate: new Date(dateStr + "T00:00:00Z"),
            status: "SCHEDULED",
          },
        });
        createdCount++;
      } else {
        if (existing.status === "COMPLETED") {
          preservedCompletedCount++;
        } else {
          keptCount++;
        }
      }
    }

    // 2. Process rows no longer in targetDates
    for (const [existingDateStr, row] of existingMap.entries()) {
      if (!targetDates.includes(existingDateStr)) {
        if (row.status === "COMPLETED") {
          // COMPLETED rows are NEVER deleted or changed
          preservedCompletedCount++;
        } else {
          // It is a SCHEDULED row
          if (existingDateStr >= todayIstStr) {
            // Future date that no longer matches rule -> remove
            await prisma.autoclaveCleaningSchedule.delete({ where: { id: row.id } });
            removedCount++;
          } else {
            // Past scheduled row -> KEEP (it is an overdue record)
            keptPastScheduled.push(existingDateStr);
            keptCount++;
          }
        }
      }
    }

    await recordAudit({
      tableName: "autoclave_cleaning_schedule",
      recordId: `${equipment.id}_${monthStr}`,
      action: "GENERATE_CLEANING_SCHEDULE",
      changedById: adminId,
      newValue: JSON.stringify({
        rule: { firstDay, secondDay, intervalDays },
        createdCount,
        removedCount,
        preservedCompletedCount,
        keptPastScheduled,
      }),
    });

    return {
      createdCount,
      keptCount,
      removedCount,
      preservedCompletedCount,
      keptPastScheduled,
      dates: targetDates,
    };
  }

  /**
   * 2. GET /api/autoclave/cleaning?month&equipment_id
   */
  async listSchedule(monthStr: string, equipmentId?: string) {
    if (!/^\d{4}-\d{2}$/.test(monthStr)) {
      throw Err.validation("month must be formatted as YYYY-MM");
    }

    const [year, month] = monthStr.split("-").map(Number);
    const reportingMonth = new Date(Date.UTC(year, month - 1, 1));

    const where: any = { reportingMonth };
    if (equipmentId) where.equipmentId = equipmentId;

    const rows = await prisma.autoclaveCleaningSchedule.findMany({
      where,
      include: {
        doneBy: { select: { id: true, fullName: true } },
      },
      orderBy: { scheduledDate: "asc" },
    });

    const { dateStr: todayIstStr } = getTodayInKolkata();

    let scheduledCount = 0;
    let completedCount = 0;
    let overdueCount = 0;

    const mapped = rows.map((r) => {
      const scheduledIso = r.scheduledDate.toISOString().slice(0, 10);
      const statusDisplay = computeCleaningStatusDisplay(
        scheduledIso,
        r.status as "SCHEDULED" | "COMPLETED",
        todayIstStr
      );

      if (statusDisplay === "COMPLETED") completedCount++;
      else if (statusDisplay === "OVERDUE") overdueCount++;
      else scheduledCount++;

      return {
        id: r.id,
        equipmentId: r.equipmentId,
        reportingMonth: monthStr,
        scheduledDate: formatDateDMY(r.scheduledDate),
        scheduledDateIso: scheduledIso,
        status: r.status,
        statusDisplay,
        actualDate: r.actualDate ? formatDateDMY(r.actualDate) : null,
        actualDateIso: r.actualDate ? r.actualDate.toISOString().slice(0, 10) : null,
        doneBy: r.doneBy?.fullName ?? null,
        doneById: r.doneById ?? null,
        completedAt: r.completedAt,
      };
    });

    return {
      total: rows.length,
      scheduledCount,
      completedCount,
      overdueCount,
      rows: mapped,
    };
  }

  /**
   * 3. POST /api/autoclave/cleaning/:id/complete
   */
  async completeCleaning(
    id: string,
    data: { actual_date: string; done_by?: string; notes?: string },
    user: { id: string; role: string }
  ) {
    if (!data.actual_date) throw Err.validation("actual_date is required");

    const record = await prisma.autoclaveCleaningSchedule.findUnique({ where: { id } });
    if (!record) throw Err.notFound("AutoclaveCleaningSchedule");

    if (record.status === "COMPLETED") {
      throw Err.conflict("This cleaning schedule entry is already marked as COMPLETED.");
    }

    const { dateStr: todayIstStr } = getTodayInKolkata();
    if (data.actual_date > todayIstStr) {
      throw Err.businessRule("Actual cleaning date cannot be in the future (relative to laboratory timezone).");
    }

    // Resolve done_by staff
    let targetDoneById = user.id;
    if (data.done_by) {
      const snapshot = await this.autoclaveService.getLatestSettingsSnapshot();
      if (!snapshot.allow_select_other_staff && data.done_by !== user.id) {
        throw Err.businessRule("Selecting other staff members is disabled in settings.");
      }
      const staff = await prisma.profile.findUnique({ where: { id: data.done_by } });
      if (!staff || !staff.active) {
        throw Err.unknownDoneBy();
      }
      targetDoneById = data.done_by;
    }

    const actualDate = new Date(data.actual_date + "T00:00:00Z");

    const updated = await prisma.autoclaveCleaningSchedule.update({
      where: { id },
      data: {
        status: "COMPLETED",
        actualDate,
        doneById: targetDoneById,
        completedAt: new Date(),
      },
    });

    await recordAudit({
      tableName: "autoclave_cleaning_schedule",
      recordId: id,
      action: "COMPLETE_CLEANING",
      changedById: user.id,
      newValue: JSON.stringify({ actual_date: data.actual_date, doneById: targetDoneById, notes: data.notes }),
    });

    return updated;
  }

  /**
   * 4. POST /api/autoclave/cleaning/:id/reopen
   */
  async reopenCleaning(id: string, reason: string, user: { id: string; role: string }) {
    if (!reason || !reason.trim()) {
      throw Err.validation("Reason is required to reopen a cleaning schedule entry.");
    }

    const record = await prisma.autoclaveCleaningSchedule.findUnique({ where: { id } });
    if (!record) throw Err.notFound("AutoclaveCleaningSchedule");

    if (record.status !== "COMPLETED") {
      throw Err.businessRule("Only COMPLETED cleaning entries can be reopened.");
    }

    const updated = await prisma.autoclaveCleaningSchedule.update({
      where: { id },
      data: {
        status: "SCHEDULED",
        actualDate: null,
        doneById: null,
        completedAt: null,
      },
    });

    await recordAudit({
      tableName: "autoclave_cleaning_schedule",
      recordId: id,
      action: "REOPEN_CLEANING",
      changedById: user.id,
      reason,
      oldValue: JSON.stringify({ actualDate: record.actualDate, doneById: record.doneById }),
      newValue: "SCHEDULED",
    });

    return updated;
  }

  /**
   * 5. GET /api/autoclave/cleaning/:id/history
   */
  async getHistory(id: string) {
    const history = await prisma.auditLog.findMany({
      where: {
        tableName: "autoclave_cleaning_schedule",
        recordId: id,
      },
      include: {
        changedBy: { select: { fullName: true } },
      },
      orderBy: { changedAt: "desc" },
    });

    return history.map((h) => ({
      id: h.id,
      action: h.action,
      field: h.field,
      oldValue: h.oldValue,
      newValue: h.newValue,
      reason: h.reason,
      changedBy: h.changedBy?.fullName ?? "System",
      changedAt: h.changedAt,
    }));
  }
}
