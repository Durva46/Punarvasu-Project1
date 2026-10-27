/**
 * backend/src/modules/autoclave/service.ts
 *
 * Autoclave generation logic, verification flow, and entry lifecycle.
 * Fully implements Phase 4 & Phase 6 updates:
 *  - Matches cleaning rows for each entry's log_date
 *  - Returns unattached_cleaning at the top level of listEntries response
 *  - Real summary cleaning counts & status display text
 */

import { prisma } from "../../lib/prisma";
import { recordAudit, recordFieldAudit } from "../../lib/audit";
import { Err } from "../../lib/errors";
import { formatDateDMY, firstOfMonth } from "../../lib/time";
import {
  buildDefaultsFromSettings,
  checkAcceptanceLimits,
  addMinutesToTime,
  isValidTime,
  AutoclaveSettingsSnapshot,
} from "./shared";
import {
  getTodayInKolkata,
  computeCleaningStatusDisplay,
} from "./cleaningShared";
import { Prisma } from "@prisma/client";

export class AutoclaveService {
  /**
   * Reads current autoclave settings as a snapshot (key -> latest value).
   */
  async getLatestSettingsSnapshot(): Promise<AutoclaveSettingsSnapshot> {
    const settings = await prisma.autoclaveSetting.findMany({
      orderBy: { version: "desc" },
    });

    const snapshot: Record<string, any> = {};
    for (const s of settings) {
      if (!(s.key in snapshot)) {
        snapshot[s.key] = s.value;
      }
    }

    return snapshot as AutoclaveSettingsSnapshot;
  }

  /**
   * 1. POST /api/autoclave/generate { report_id }
   */
  async generateForReport(reportId: string, authenticatedUserId: string) {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        samples: {
          orderBy: { registrationDate: "asc" },
        },
      },
    });
    if (!report) throw Err.notFound("Report");

    // Load default load type for "Media"
    const mediaLoadType = await prisma.loadType.findUnique({
      where: { name: "Media" },
    });
    if (!mediaLoadType) throw Err.businessRule("Load type 'Media' not found in database.");

    // Take current settings snapshot
    const snapshot = await this.getLatestSettingsSnapshot();
    const defaults = buildDefaultsFromSettings(snapshot);

    // Group samples by registration date
    const samplesByDate = new Map<string, typeof report.samples>();
    for (const sample of report.samples) {
      const dateKey = sample.registrationDate.toISOString().slice(0, 10);
      const list = samplesByDate.get(dateKey) ?? [];
      list.push(sample);
      samplesByDate.set(dateKey, list);
    }

    let createdCount = 0;
    let skippedCount = 0;
    let refreshedCount = 0;
    const warnings: string[] = [];
    const entryIds: string[] = [];

    for (const [dateStr, samples] of samplesByDate.entries()) {
      const logDate = new Date(dateStr + "T00:00:00Z");
      const sampleCount = samples.length;
      const formattedDate = formatDateDMY(logDate);
      const loadDescription = `Media – ${formattedDate} (${sampleCount} samples)`;

      // Check if media preparation records exist for this date
      const mediaRecords = await prisma.mediaPreparationRecord.findMany({
        where: { reportId, prepDate: logDate },
      });

      if (mediaRecords.length === 0) {
        const msg = `Date ${formattedDate} has ${sampleCount} samples but no media preparation records.`;
        warnings.push(msg);

        // Store as alert with type AUTOCLAVE_VALIDATION (avoid duplicates)
        const existingAlert = await prisma.alert.findFirst({
          where: { reportId, alertType: "AUTOCLAVE_VALIDATION", message: msg },
        });
        if (!existingAlert) {
          await prisma.alert.create({
            data: {
              reportId,
              alertType: "AUTOCLAVE_VALIDATION",
              severity: "WARNING",
              message: msg,
              relatedTable: "autoclave_log_entries",
            },
          });
        }
      }

      // Check for samples missing names
      for (const s of samples) {
        if (!s.sampleName) {
          warnings.push(`Sample ${s.sampleIdentifier || s.id} on ${formattedDate} is missing a name.`);
        }
      }

      // Find existing entry
      const existingEntry = await prisma.autoclaveLogEntry.findUnique({
        where: {
          reportId_logDate_loadTypeId: {
            reportId,
            logDate,
            loadTypeId: mediaLoadType.id,
          },
        },
        include: { sources: true },
      });

      if (existingEntry) {
        entryIds.push(existingEntry.id);

        if (existingEntry.verificationStatus === "VERIFIED") {
          if (existingEntry.sources.length < samples.length) {
            warnings.push(
              `New samples appeared for date ${formattedDate}, but the autoclave entry is already VERIFIED.`
            );
          }
          skippedCount++;
          continue;
        }

        if (existingEntry.isUserEdited || existingEntry.verificationStatus !== "PREFILLED") {
          skippedCount++;
          continue;
        }

        // For PREFILLED and unedited entries: refresh description and sources
        await prisma.autoclaveLogEntry.update({
          where: { id: existingEntry.id },
          data: {
            loadDescription,
            updatedById: authenticatedUserId,
          },
        });

        // Re-sync sources
        await prisma.autoclaveEntrySource.deleteMany({
          where: { entryId: existingEntry.id },
        });

        const sourceRecords = [
          ...samples.map((s) => ({
            entryId: existingEntry.id,
            sampleId: s.id,
            mediaPrepRecordId: null,
          })),
          ...mediaRecords.map((m) => ({
            entryId: existingEntry.id,
            sampleId: null,
            mediaPrepRecordId: m.id,
          })),
        ];

        if (sourceRecords.length > 0) {
          await prisma.autoclaveEntrySource.createMany({ data: sourceRecords });
        }

        refreshedCount++;
      } else {
        // Create new entry
        const reportingMonth = firstOfMonth(logDate);

        const newEntry = await prisma.autoclaveLogEntry.create({
          data: {
            reportId,
            reportingMonth,
            logDate,
            loadTypeId: mediaLoadType.id,
            loadDescription,
            autoclaveStartTime: defaults.autoclaveStartTime,
            sterilizationStartTime: defaults.sterilizationStartTime,
            temperatureC: new Prisma.Decimal(defaults.temperatureC),
            pressureValue: new Prisma.Decimal(defaults.pressureValue),
            pressureUnit: defaults.pressureUnit,
            endTime: defaults.endTime,
            endDateOffset: defaults.endDateOffset,
            endTimeOverridden: false,
            verificationStatus: "PREFILLED",
            isUserEdited: false,
            doneById: authenticatedUserId,
            createdById: authenticatedUserId,
            updatedById: authenticatedUserId,
          },
        });

        entryIds.push(newEntry.id);

        // Link sources
        const sourceRecords = [
          ...samples.map((s) => ({
            entryId: newEntry.id,
            sampleId: s.id,
            mediaPrepRecordId: null,
          })),
          ...mediaRecords.map((m) => ({
            entryId: newEntry.id,
            sampleId: null,
            mediaPrepRecordId: m.id,
          })),
        ];

        if (sourceRecords.length > 0) {
          await prisma.autoclaveEntrySource.createMany({ data: sourceRecords });
        }

        createdCount++;
      }
    }

    await recordAudit({
      tableName: "autoclave_log_entries",
      recordId: reportId,
      action: "GENERATE_AUTOCLAVE",
      changedById: authenticatedUserId,
      newValue: JSON.stringify({ createdCount, skippedCount, refreshedCount }),
    });

    return {
      createdCount,
      skippedCount,
      refreshedCount,
      warnings,
      entryIds,
    };
  }

  /**
   * 2. GET /api/autoclave/entries
   * Updated in Phase 6 to attach matching weekly cleaning rows and return unattached_cleaning
   */
  async listEntries(query: {
    report_id?: string;
    month?: string;
    from?: string;
    to?: string;
    search?: string;
    sort?: string;
    dir?: "asc" | "desc";
    page?: number;
    page_size?: number;
  }) {
    const page = query.page ?? 1;
    const pageSize = query.page_size ?? 25;
    const snapshot = await this.getLatestSettingsSnapshot();

    const where: Prisma.AutoclaveLogEntryWhereInput = {};

    if (query.report_id) {
      where.reportId = query.report_id;
    }

    let targetReportingMonth: Date | null = null;

    if (query.month) {
      const d = new Date(query.month + "-01T00:00:00Z");
      if (!isNaN(d.getTime())) {
        targetReportingMonth = firstOfMonth(d);
        where.reportingMonth = targetReportingMonth;
      }
    } else if (query.report_id) {
      const rep = await prisma.report.findUnique({
        where: { id: query.report_id },
        select: { reportingMonth: true },
      });
      if (rep) targetReportingMonth = rep.reportingMonth;
    }

    if (query.from || query.to) {
      where.logDate = {};
      if (query.from) where.logDate.gte = new Date(query.from + "T00:00:00Z");
      if (query.to) where.logDate.lte = new Date(query.to + "T00:00:00Z");
    }

    if (query.search) {
      where.OR = [
        { loadDescription: { contains: query.search, mode: "insensitive" } },
        { doneBy: { fullName: { contains: query.search, mode: "insensitive" } } },
      ];
    }

    const sortField = query.sort ?? "logDate";
    const sortDir = query.dir ?? "asc";
    const orderBy: Prisma.AutoclaveLogEntryOrderByWithRelationInput = {
      [sortField]: sortDir,
    };

    const [total, entries] = await Promise.all([
      prisma.autoclaveLogEntry.count({ where }),
      prisma.autoclaveLogEntry.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          loadType: true,
          doneBy: { select: { id: true, fullName: true } },
          verifiedBy: { select: { id: true, fullName: true } },
          _count: {
            select: { sources: true },
          },
        },
      }),
    ]);

    const { dateStr: todayIstStr } = getTodayInKolkata();

    // Fetch cleaning schedule rows for reporting month if available
    let cleaningRows: any[] = [];
    if (targetReportingMonth) {
      cleaningRows = await prisma.autoclaveCleaningSchedule.findMany({
        where: { reportingMonth: targetReportingMonth },
        include: { doneBy: { select: { fullName: true } } },
        orderBy: { scheduledDate: "asc" },
      });
    }

    // Map cleaning rows by ISO date
    const cleaningByDate = new Map<string, any[]>();
    for (const c of cleaningRows) {
      const dateKey = c.scheduledDate.toISOString().slice(0, 10);
      const list = cleaningByDate.get(dateKey) ?? [];
      const statusDisplay = computeCleaningStatusDisplay(
        dateKey,
        c.status as "SCHEDULED" | "COMPLETED",
        todayIstStr
      );
      list.push({
        id: c.id,
        scheduledDate: formatDateDMY(c.scheduledDate),
        scheduledDateIso: dateKey,
        status: c.status,
        statusDisplay,
        actualDate: c.actualDate ? formatDateDMY(c.actualDate) : null,
        doneBy: c.doneBy?.fullName ?? null,
      });
      cleaningByDate.set(dateKey, list);
    }

    const entryDatesSet = new Set<string>();

    const mapped = entries.map((e) => {
      const tempNum = e.actualTemperatureC !== null ? Number(e.actualTemperatureC) : Number(e.temperatureC);
      const pressNum = e.actualPressureValue !== null ? Number(e.actualPressureValue) : Number(e.pressureValue);
      const dateIso = e.logDate.toISOString().slice(0, 10);
      entryDatesSet.add(dateIso);

      const limitWarning = checkAcceptanceLimits({
        temperatureC: tempNum,
        pressureValue: pressNum,
        snapshot,
      });

      return {
        id: e.id,
        reportId: e.reportId,
        reportingMonth: formatDateDMY(e.reportingMonth),
        logDate: formatDateDMY(e.logDate),
        loadTypeId: e.loadTypeId,
        loadTypeName: e.loadType.name,
        loadDescription: e.loadDescription,
        autoclaveStartTime: e.autoclaveStartTime,
        sterilizationStartTime: e.sterilizationStartTime,
        temperatureC: Number(e.temperatureC),
        pressureValue: Number(e.pressureValue),
        pressureUnit: e.pressureUnit,
        endTime: e.endTime,
        endDateOffset: e.endDateOffset,
        endTimeOverridden: e.endTimeOverridden,
        actualTemperatureC: e.actualTemperatureC ? Number(e.actualTemperatureC) : null,
        actualPressureValue: e.actualPressureValue ? Number(e.actualPressureValue) : null,
        actualPressureUnit: e.actualPressureUnit,
        actualStartTime: e.actualStartTime,
        actualEndTime: e.actualEndTime,
        verificationStatus: e.verificationStatus,
        isUserEdited: e.isUserEdited,
        doneBy: e.doneBy.fullName,
        doneById: e.doneBy.id,
        verifiedBy: e.verifiedBy?.fullName ?? null,
        verifiedAt: e.verifiedAt,
        notes: e.notes,
        sourceCount: e._count.sources,
        limitWarning,
        cleaning: cleaningByDate.get(dateIso) ?? [],
      };
    });

    // Unattached cleaning rows: cleaning dates with NO autoclave entry on that date
    const unattachedCleaning: any[] = [];
    for (const [dateKey, cList] of cleaningByDate.entries()) {
      if (!entryDatesSet.has(dateKey)) {
        unattachedCleaning.push(...cList);
      }
    }

    return { data: mapped, total, unattachedCleaning };
  }

  /**
   * 3. POST /api/autoclave/entries (Manual Extra Entry)
   */
  async createManualEntry(
    data: {
      report_id: string;
      load_type_id: string;
      log_date: string;
      load_description: string;
    },
    userId: string
  ) {
    const logDate = new Date(data.log_date + "T00:00:00Z");
    if (isNaN(logDate.getTime())) throw Err.validation("Invalid log_date.");

    const snapshot = await this.getLatestSettingsSnapshot();
    const defaults = buildDefaultsFromSettings(snapshot);
    const reportingMonth = firstOfMonth(logDate);

    try {
      const entry = await prisma.autoclaveLogEntry.create({
        data: {
          reportId: data.report_id,
          reportingMonth,
          logDate,
          loadTypeId: data.load_type_id,
          loadDescription: data.load_description,
          autoclaveStartTime: defaults.autoclaveStartTime,
          sterilizationStartTime: defaults.sterilizationStartTime,
          temperatureC: new Prisma.Decimal(defaults.temperatureC),
          pressureValue: new Prisma.Decimal(defaults.pressureValue),
          pressureUnit: defaults.pressureUnit,
          endTime: defaults.endTime,
          endDateOffset: defaults.endDateOffset,
          endTimeOverridden: false,
          verificationStatus: "PREFILLED",
          isUserEdited: true,
          doneById: userId,
          createdById: userId,
          updatedById: userId,
        },
      });

      await recordAudit({
        tableName: "autoclave_log_entries",
        recordId: entry.id,
        action: "CREATE",
        changedById: userId,
        newValue: JSON.stringify(data),
      });

      return entry;
    } catch (err: any) {
      if (err.code === "P2002") {
        throw Err.conflict(
          "An entry for this date and load type already exists in this report."
        );
      }
      throw err;
    }
  }

  /**
   * 4. PATCH /api/autoclave/entries/:id
   */
  async updateEntry(
    id: string,
    updates: Record<string, any>,
    user: { id: string; role: string }
  ) {
    const entry = await prisma.autoclaveLogEntry.findUnique({
      where: { id },
    });
    if (!entry) throw Err.notFound("AutoclaveLogEntry");

    const snapshot = await this.getLatestSettingsSnapshot();
    const isVerifierOrAdmin = user.role === "admin" || user.role === "verifier";

    if (entry.verificationStatus === "VERIFIED") {
      if (!isVerifierOrAdmin) {
        throw Err.verifiedImmutable();
      }
      if (!updates.reason) {
        throw Err.businessRule("Reopening/editing a VERIFIED entry requires a reason.");
      }
      updates.verificationStatus = "PENDING_VERIFICATION";
      updates.verifiedById = null;
      updates.verifiedAt = null;
    }

    if (updates.done_by) {
      const targetProfile = await prisma.profile.findUnique({
        where: { id: updates.done_by },
      });
      if (!targetProfile || !targetProfile.active) {
        throw Err.unknownDoneBy();
      }

      if (!snapshot.allow_select_other_staff && updates.done_by !== user.id && updates.done_by !== entry.doneById) {
        throw Err.businessRule("Selecting other staff members is disabled in settings.");
      }
    }

    if (updates.log_date) {
      const newDate = new Date(updates.log_date + "T00:00:00Z");
      if (isNaN(newDate.getTime())) throw Err.validation("Invalid log_date.");

      const oldMonth = entry.reportingMonth.toISOString().slice(0, 7);
      const newMonth = firstOfMonth(newDate).toISOString().slice(0, 7);

      if (oldMonth !== newMonth) {
        if (!updates.confirm_month_change || !updates.reason) {
          throw Err.monthChangeBlocked();
        }
      }
      updates.reportingMonth = firstOfMonth(newDate);
      updates.logDate = newDate;
    }

    const duration = snapshot.sterilization_duration_minutes ?? 15;
    if (updates.sterilization_start_time) {
      if (!isValidTime(updates.sterilization_start_time)) {
        throw Err.validation("Invalid sterilization_start_time format (HH:mm).");
      }
      if (!entry.endTimeOverridden && !updates.end_time) {
        const { time: newEnd, dayOffset } = addMinutesToTime(updates.sterilization_start_time, duration);
        updates.endTime = newEnd;
        updates.endDateOffset = dayOffset;
      }
    }

    if (updates.end_time) {
      if (!isValidTime(updates.end_time)) {
        throw Err.validation("Invalid end_time format (HH:mm).");
      }
      updates.endTimeOverridden = true;
      updates.endTime = updates.end_time;
    }

    const dataToUpdate: Prisma.AutoclaveLogEntryUpdateInput = {
      isUserEdited: true,
      updatedBy: { connect: { id: user.id } },
    };

    if (updates.load_description) dataToUpdate.loadDescription = updates.load_description;
    if (updates.autoclave_start_time) dataToUpdate.autoclaveStartTime = updates.autoclave_start_time;
    if (updates.sterilization_start_time) dataToUpdate.sterilizationStartTime = updates.sterilization_start_time;
    if (updates.temperature_c !== undefined) dataToUpdate.temperatureC = new Prisma.Decimal(updates.temperature_c);
    if (updates.pressure_value !== undefined) dataToUpdate.pressureValue = new Prisma.Decimal(updates.pressure_value);
    if (updates.pressure_unit) dataToUpdate.pressureUnit = updates.pressure_unit;
    if (updates.endTime) dataToUpdate.endTime = updates.endTime;
    if (updates.endDateOffset !== undefined) dataToUpdate.endDateOffset = updates.endDateOffset;
    if (updates.endTimeOverridden !== undefined) dataToUpdate.endTimeOverridden = updates.endTimeOverridden;
    if (updates.done_by) dataToUpdate.doneBy = { connect: { id: updates.done_by } };
    if (updates.notes !== undefined) dataToUpdate.notes = updates.notes;
    if (updates.logDate) dataToUpdate.logDate = updates.logDate;
    if (updates.reportingMonth) dataToUpdate.reportingMonth = updates.reportingMonth;
    if (updates.verificationStatus) dataToUpdate.verificationStatus = updates.verificationStatus;

    const updated = await prisma.autoclaveLogEntry.update({
      where: { id },
      data: dataToUpdate,
    });

    await recordFieldAudit({
      tableName: "autoclave_log_entries",
      recordId: id,
      changedById: user.id,
      reason: updates.reason,
      before: entry as any,
      after: updated as any,
    });

    return updated;
  }

  /**
   * 5. POST /api/autoclave/entries/:id/reset-end-time
   */
  async resetEndTime(id: string, userId: string) {
    const entry = await prisma.autoclaveLogEntry.findUnique({ where: { id } });
    if (!entry) throw Err.notFound("AutoclaveLogEntry");

    const snapshot = await this.getLatestSettingsSnapshot();
    const duration = snapshot.sterilization_duration_minutes ?? 15;

    const { time: calculatedEnd, dayOffset } = addMinutesToTime(
      entry.sterilizationStartTime,
      duration
    );

    const updated = await prisma.autoclaveLogEntry.update({
      where: { id },
      data: {
        endTime: calculatedEnd,
        endDateOffset: dayOffset,
        endTimeOverridden: false,
        updatedById: userId,
      },
    });

    await recordAudit({
      tableName: "autoclave_log_entries",
      recordId: id,
      action: "RESET_END_TIME",
      changedById: userId,
      oldValue: entry.endTime,
      newValue: calculatedEnd,
    });

    return updated;
  }

  /**
   * 6. POST /api/autoclave/entries/:id/submit-for-verification
   */
  async submitForVerification(id: string, userId: string) {
    const entry = await prisma.autoclaveLogEntry.findUnique({ where: { id } });
    if (!entry) throw Err.notFound("AutoclaveLogEntry");

    if (entry.verificationStatus !== "PREFILLED") {
      throw Err.businessRule(`Cannot submit entry currently in status ${entry.verificationStatus}.`);
    }

    const updated = await prisma.autoclaveLogEntry.update({
      where: { id },
      data: {
        verificationStatus: "PENDING_VERIFICATION",
        updatedById: userId,
      },
    });

    await recordAudit({
      tableName: "autoclave_log_entries",
      recordId: id,
      action: "SUBMIT_FOR_VERIFICATION",
      changedById: userId,
      oldValue: "PREFILLED",
      newValue: "PENDING_VERIFICATION",
    });

    return updated;
  }

  /**
   * 7. POST /api/autoclave/entries/:id/verify
   */
  async verifyEntry(
    id: string,
    readings: {
      actual_temperature_c: number;
      actual_pressure_value: number;
      actual_start_time: string;
      actual_end_time: string;
      actual_pressure_unit?: string;
      notes?: string;
    },
    user: { id: string; role: string }
  ) {
    if (user.role !== "admin" && user.role !== "verifier") {
      throw Err.insufficientRole(["admin", "verifier"]);
    }

    const entry = await prisma.autoclaveLogEntry.findUnique({ where: { id } });
    if (!entry) throw Err.notFound("AutoclaveLogEntry");

    if (!isValidTime(readings.actual_start_time)) throw Err.validation("Invalid actual_start_time.");
    if (!isValidTime(readings.actual_end_time)) throw Err.validation("Invalid actual_end_time.");

    const updated = await prisma.autoclaveLogEntry.update({
      where: { id },
      data: {
        actualTemperatureC: new Prisma.Decimal(readings.actual_temperature_c),
        actualPressureValue: new Prisma.Decimal(readings.actual_pressure_value),
        actualPressureUnit: readings.actual_pressure_unit || entry.pressureUnit,
        actualStartTime: readings.actual_start_time,
        actualEndTime: readings.actual_end_time,
        notes: readings.notes ?? entry.notes,
        verificationStatus: "VERIFIED",
        verifiedById: user.id,
        verifiedAt: new Date(),
        updatedById: user.id,
      },
    });

    await recordAudit({
      tableName: "autoclave_log_entries",
      recordId: id,
      action: "VERIFY",
      changedById: user.id,
      newValue: JSON.stringify(readings),
    });

    return updated;
  }

  /**
   * POST /api/autoclave/entries/:id/reject-verification
   */
  async rejectVerification(id: string, reason: string, user: { id: string; role: string }) {
    if (user.role !== "admin" && user.role !== "verifier") {
      throw Err.insufficientRole(["admin", "verifier"]);
    }
    if (!reason) throw Err.validation("Reason is required to reject verification.");

    const entry = await prisma.autoclaveLogEntry.findUnique({ where: { id } });
    if (!entry) throw Err.notFound("AutoclaveLogEntry");

    const updated = await prisma.autoclaveLogEntry.update({
      where: { id },
      data: {
        verificationStatus: "PENDING_VERIFICATION",
        verifiedById: null,
        verifiedAt: null,
        notes: entry.notes ? `${entry.notes} [Verification Rejected: ${reason}]` : `[Verification Rejected: ${reason}]`,
        updatedById: user.id,
      },
    });

    await recordAudit({
      tableName: "autoclave_log_entries",
      recordId: id,
      action: "REJECT_VERIFICATION",
      changedById: user.id,
      reason,
      oldValue: entry.verificationStatus,
      newValue: "PENDING_VERIFICATION",
    });

    return updated;
  }

  /**
   * 8. GET /api/autoclave/entries/:id/history
   */
  async getEntryHistory(id: string) {
    const history = await prisma.auditLog.findMany({
      where: {
        tableName: "autoclave_log_entries",
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

  /**
   * 9. GET /api/autoclave/summary
   * Updated in Phase 6 with real cleaning schedule counts & status display text
   */
  async getSummary(opts: { report_id?: string; month?: string }) {
    const where: Prisma.AutoclaveLogEntryWhereInput = {};
    let targetReportingMonth: Date | null = null;

    if (opts.report_id) {
      where.reportId = opts.report_id;
      const rep = await prisma.report.findUnique({
        where: { id: opts.report_id },
        select: { reportingMonth: true },
      });
      if (rep) targetReportingMonth = rep.reportingMonth;
    }

    if (opts.month) {
      const d = new Date(opts.month + "-01T00:00:00Z");
      if (!isNaN(d.getTime())) {
        targetReportingMonth = firstOfMonth(d);
        where.reportingMonth = targetReportingMonth;
      }
    }

    const [total, verified, prefilled, pending] = await Promise.all([
      prisma.autoclaveLogEntry.count({ where }),
      prisma.autoclaveLogEntry.count({ where: { ...where, verificationStatus: "VERIFIED" } }),
      prisma.autoclaveLogEntry.count({ where: { ...where, verificationStatus: "PREFILLED" } }),
      prisma.autoclaveLogEntry.count({ where: { ...where, verificationStatus: "PENDING_VERIFICATION" } }),
    ]);

    const equipment = await prisma.autoclaveEquipment.findFirst({
      where: { active: true },
    });

    // Real cleaning counts from autoclave_cleaning_schedule
    let scheduledCleaningCount = 0;
    let completedCleaningCount = 0;
    let overdueCleaningCount = 0;
    let cleaningStatusText = "Not generated yet";

    if (targetReportingMonth) {
      const { dateStr: todayIstStr } = getTodayInKolkata();

      const cleaningRows = await prisma.autoclaveCleaningSchedule.findMany({
        where: { reportingMonth: targetReportingMonth },
      });

      if (cleaningRows.length > 0) {
        for (const c of cleaningRows) {
          const dateStr = c.scheduledDate.toISOString().slice(0, 10);
          const statusDisplay = computeCleaningStatusDisplay(
            dateStr,
            c.status as "SCHEDULED" | "COMPLETED",
            todayIstStr
          );

          if (statusDisplay === "COMPLETED") completedCleaningCount++;
          else if (statusDisplay === "OVERDUE") overdueCleaningCount++;
          else scheduledCleaningCount++;
        }

        const totalCleaning = cleaningRows.length;
        if (overdueCleaningCount > 0) {
          cleaningStatusText = `${completedCleaningCount} of ${totalCleaning} completed, ${overdueCleaningCount} overdue`;
        } else {
          cleaningStatusText = `${completedCleaningCount} of ${totalCleaning} completed`;
        }
      }
    }

    return {
      totalEntries: total,
      completedCount: verified,
      prefilledCount: prefilled,
      pendingCount: pending,
      cleaning: {
        scheduled: scheduledCleaningCount,
        completed: completedCleaningCount,
        overdue: overdueCleaningCount,
        statusText: cleaningStatusText,
      },
      equipment: equipment
        ? {
            formatNo: equipment.formatNo,
            refSopNo: equipment.refSopNo,
            equipmentNo: equipment.equipmentNo,
          }
        : undefined,
    };
  }

  /**
   * 10. Update autoclave settings (admin only)
   */
  async updateSettings(settings: Record<string, any>, adminId: string) {
    for (const [key, val] of Object.entries(settings)) {
      const latest = await prisma.autoclaveSetting.findFirst({
        where: { key },
        orderBy: { version: "desc" },
      });

      const nextVersion = latest ? latest.version + 1 : 1;

      await prisma.autoclaveSetting.create({
        data: {
          key,
          value: val,
          version: nextVersion,
          updatedById: adminId,
        },
      });

      await recordAudit({
        tableName: "autoclave_settings",
        recordId: `${key}_v${nextVersion}`,
        action: "UPDATE_SETTING",
        changedById: adminId,
        field: key,
        oldValue: latest ? JSON.stringify(latest.value) : undefined,
        newValue: JSON.stringify(val),
      });
    }

    return this.getLatestSettingsSnapshot();
  }
}
