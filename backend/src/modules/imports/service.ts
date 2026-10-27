/**
 * backend/src/modules/imports/service.ts
 *
 * Excel parsing and import business logic.
 *
 * Rules from AGENTS.md §10:
 *  - Column mapping read from AppSetting (never hardcoded)
 *  - sampleName "water" detection (case-insensitive) sets isWater flag
 *  - MAX_IMPORT_ROWS limit enforced
 *  - Alerts created for: missing sample name, invalid date, duplicate AR number
 */

import * as XLSX from "xlsx";
import { prisma } from "../../lib/prisma";
import { recordAudit } from "../../lib/audit";
import { Err } from "../../lib/errors";
import { formatDateDMY, firstOfMonth } from "../../lib/time";
import { env } from "../../config/env";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ImportExcelOpts {
  buffer:     Buffer;
  fileName:   string;
  uploadedBy: string;  // profile id
}

interface SampleRow {
  sampleIdentifier?: string;
  sampleName?:       string;
  registrationDate?: Date;
  batchNumber?:      string;
}

export interface DailyCount {
  date:         string;          // "YYYY-MM-DD"
  displayDate:  string;          // "DD-MM-YYYY"
  total:        number;          // S
  waterCount:   number;          // W
  nonWaterCount: number;         // N = S - W
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

export class ImportService {

  // ── Column mapping (read from AppSetting; falls back to defaults) ──────────
  private async getColumnMapping(): Promise<Record<string, string>> {
    const settings = await prisma.appSetting.findMany({
      where: { key: { startsWith: "col_map." } },
    });

    const defaults: Record<string, string> = {
      sampleIdentifier: "AR Number",
      sampleName:       "Sample Name",
      registrationDate: "Test Request Date",
      batchNumber:      "Batch Number",
    };

    for (const s of settings) {
      const field = s.key.replace("col_map.", "");
      defaults[field] = s.value;
    }
    return defaults;
  }

  // ── Main import entry point ───────────────────────────────────────────────
  async importExcel(opts: ImportExcelOpts) {
    const { buffer, fileName, uploadedBy } = opts;

    // Parse workbook
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    } catch {
      throw Err.validation("Could not read the Excel file. Make sure it is a valid .xlsx or .xls file.");
    }

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw Err.validation("The Excel file has no worksheets.");

    const sheet = workbook.Sheets[sheetName];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: null });

    if (rows.length === 0) throw Err.validation("The Excel sheet is empty.");
    if (rows.length > env.MAX_IMPORT_ROWS) {
      throw Err.validation(`The file has ${rows.length} rows, which exceeds the limit of ${env.MAX_IMPORT_ROWS}.`);
    }

    // Load column mapping
    const colMap = await this.getColumnMapping();

    // Determine reporting month from dates in the file
    const dates: Date[] = [];
    const sampleRows: SampleRow[] = [];
    const warnings: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // Excel row number (1-indexed header + 1)

      // Extract fields using column mapping
      const identifier  = String(row[colMap.sampleIdentifier] ?? "").trim();
      const name        = String(row[colMap.sampleName] ?? "").trim();
      const dateRaw     = row[colMap.registrationDate];
      const batch       = String(row[colMap.batchNumber] ?? "").trim();

      // Validate date
      let regDate: Date | null = null;
      if (dateRaw instanceof Date && !isNaN(dateRaw.getTime())) {
        regDate = dateRaw;
      } else if (typeof dateRaw === "string" || typeof dateRaw === "number") {
        const parsed = new Date(dateRaw);
        if (!isNaN(parsed.getTime())) regDate = parsed;
      }

      if (!regDate) {
        warnings.push(`Row ${rowNum}: Invalid or missing date "${dateRaw}" — row skipped.`);
        continue;
      }

      if (!name) {
        warnings.push(`Row ${rowNum}: Sample name is blank (AR: ${identifier || "unknown"}).`);
      }

      dates.push(regDate);
      sampleRows.push({
        sampleIdentifier: identifier || undefined,
        sampleName:       name || undefined,
        registrationDate: regDate,
        batchNumber:      batch || undefined,
      });
    }

    if (sampleRows.length === 0) {
      throw Err.validation("No valid sample rows could be parsed from the file.");
    }

    // Determine reporting month (first day of the most common month)
    const monthCounts: Record<string, number> = {};
    for (const d of dates) {
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      monthCounts[key] = (monthCounts[key] ?? 0) + 1;
    }
    const dominantKey = Object.entries(monthCounts).sort((a, b) => b[1] - a[1])[0][0];
    const [yr, mo] = dominantKey.split("-").map(Number);
    const reportingMonth = new Date(Date.UTC(yr, mo, 1));

    // Compute period start/end from actual sample dates
    const sortedDates = [...dates].sort((a, b) => a.getTime() - b.getTime());
    const periodStart = new Date(Date.UTC(
      sortedDates[0].getFullYear(),
      sortedDates[0].getMonth(),
      sortedDates[0].getDate()
    ));
    const lastDate = sortedDates[sortedDates.length - 1];
    const periodEnd = new Date(Date.UTC(
      lastDate.getFullYear(),
      lastDate.getMonth(),
      lastDate.getDate()
    ));

    // Create Report + Samples in a transaction
    const report = await prisma.$transaction(async (tx) => {
      const newReport = await tx.report.create({
        data: {
          fileName,
          reportingMonth,
          periodStart,
          periodEnd,
          totalSamples: sampleRows.length,
          status:       "PROCESSING",
          createdById:  uploadedBy,
        },
      });

      // Track seen identifiers for duplicate detection
      const seenIds = new Set<string>();

      const samplesToCreate = sampleRows.map((s) => {
        const isWater = s.sampleName
          ? s.sampleName.toLowerCase().includes("water")
          : false;

        const isDuplicate = s.sampleIdentifier && seenIds.has(s.sampleIdentifier);
        if (s.sampleIdentifier) seenIds.add(s.sampleIdentifier);

        if (isDuplicate) {
          warnings.push(`Duplicate AR number "${s.sampleIdentifier}" found in file.`);
        }

        // Use UTC date only (strip time component)
        const regDate = s.registrationDate!;
        const registrationDate = new Date(Date.UTC(
          regDate.getFullYear(),
          regDate.getMonth(),
          regDate.getDate()
        ));

        return {
          reportId:         newReport.id,
          sampleIdentifier: s.sampleIdentifier ?? "",
          sampleName:       s.sampleName ?? null,
          registrationDate,
          batchNumber:      s.batchNumber ?? null,
          isWater,
        };
      });

      await tx.sample.createMany({ data: samplesToCreate });

      // Create alerts for warnings
      if (warnings.length > 0) {
        await tx.alert.createMany({
          data: warnings.map((msg) => ({
            reportId:    newReport.id,
            alertType:   msg.includes("Sample name") ? "MISSING_SAMPLE_NAME"
                        : msg.includes("Duplicate")  ? "DUPLICATE_SAMPLE"
                        : "INVALID_EXCEL_DATA",
            severity:    "WARNING",
            message:     msg,
            relatedTable: "samples",
          })),
        });
      }

      // Mark ready
      await tx.report.update({
        where: { id: newReport.id },
        data:  { status: "READY" },
      });

      return newReport;
    });

    // Audit
    await recordAudit({
      tableName:   "reports",
      recordId:    report.id,
      action:      "CREATE",
      changedById: uploadedBy,
      newValue:    JSON.stringify({ fileName, totalSamples: sampleRows.length }),
    });

    return {
      reportId:      report.id,
      reportingMonth: formatDateDMY(firstOfMonth(reportingMonth)),
      periodStart:   formatDateDMY(periodStart),
      periodEnd:     formatDateDMY(periodEnd),
      totalSamples:  sampleRows.length,
      warnings,
    };
  }

  // ── List all reports ───────────────────────────────────────────────────────
  async listReports() {
    const reports = await prisma.report.findMany({
      orderBy:  { reportingMonth: "desc" },
      include:  { createdBy: { select: { fullName: true } } },
    });
    return reports.map((r) => ({
      id:            r.id,
      fileName:      r.fileName,
      reportingMonth: formatDateDMY(r.reportingMonth),
      periodStart:   formatDateDMY(r.periodStart),
      periodEnd:     formatDateDMY(r.periodEnd),
      totalSamples:  r.totalSamples,
      status:        r.status,
      createdBy:     r.createdBy.fullName,
      createdAt:     r.createdAt,
    }));
  }

  // ── Get one report with daily summary ────────────────────────────────────
  async getReport(reportId: string) {
    const report = await prisma.report.findUnique({
      where:   { id: reportId },
      include: { createdBy: { select: { fullName: true } } },
    });
    if (!report) return null;

    const dailyCounts = await this.getDailyCounts(reportId);
    const alerts = await prisma.alert.findMany({
      where:   { reportId, resolved: false },
      orderBy: { createdAt: "asc" },
    });

    return {
      id:            report.id,
      fileName:      report.fileName,
      reportingMonth: formatDateDMY(report.reportingMonth),
      periodStart:   formatDateDMY(report.periodStart),
      periodEnd:     formatDateDMY(report.periodEnd),
      totalSamples:  report.totalSamples,
      status:        report.status,
      createdBy:     report.createdBy.fullName,
      createdAt:     report.createdAt,
      dailyCounts,
      alerts,
    };
  }

  // ── Per-date sample counts ────────────────────────────────────────────────
  async getDailyCounts(reportId: string): Promise<DailyCount[]> {
    // Verify report exists
    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw Err.notFound("Report");

    const samples = await prisma.sample.findMany({
      where:   { reportId },
      select:  { registrationDate: true, isWater: true },
      orderBy: { registrationDate: "asc" },
    });

    // Group by date
    const byDate = new Map<string, { total: number; water: number }>();
    for (const s of samples) {
      const key = s.registrationDate.toISOString().slice(0, 10);
      const cur = byDate.get(key) ?? { total: 0, water: 0 };
      cur.total++;
      if (s.isWater) cur.water++;
      byDate.set(key, cur);
    }

    return Array.from(byDate.entries()).map(([dateStr, counts]) => {
      const d = new Date(dateStr + "T00:00:00Z");
      return {
        date:         dateStr,
        displayDate:  formatDateDMY(d),
        total:        counts.total,
        waterCount:   counts.water,
        nonWaterCount: counts.total - counts.water,
      };
    });
  }

  // ── Paginated sample list ─────────────────────────────────────────────────
  async listSamples(
    reportId: string,
    query: {
      page: number; page_size: number;
      date?: string; search?: string;
      is_water?: string;
      sort: string; dir: "asc" | "desc";
    }
  ) {
    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw Err.notFound("Report");

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { reportId };

    if (query.date) {
      const d = new Date(query.date + "T00:00:00Z");
      if (!isNaN(d.getTime())) where.registrationDate = d;
    }

    if (query.is_water !== undefined) {
      where.isWater = query.is_water === "true";
    }

    if (query.search) {
      where.OR = [
        { sampleName:       { contains: query.search, mode: "insensitive" } },
        { sampleIdentifier: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const allowedSortFields: Record<string, string> = {
      registrationDate: "registrationDate",
      sampleName:       "sampleName",
      sampleIdentifier: "sampleIdentifier",
      createdAt:        "createdAt",
    };
    const orderBy = { [allowedSortFields[query.sort] ?? "registrationDate"]: query.dir };

    const [total, samples] = await Promise.all([
      prisma.sample.count({ where }),
      prisma.sample.findMany({
        where,
        orderBy,
        skip:  (query.page - 1) * query.page_size,
        take:  query.page_size,
      }),
    ]);

    return {
      data: samples.map((s) => ({
        id:               s.id,
        sampleIdentifier: s.sampleIdentifier,
        sampleName:       s.sampleName,
        registrationDate: formatDateDMY(s.registrationDate),
        batchNumber:      s.batchNumber,
        isWater:          s.isWater,
      })),
      total,
    };
  }

  // ── Cancel / soft-delete a report ─────────────────────────────────────────
  async cancelReport(reportId: string, adminId: string) {
    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw Err.notFound("Report");

    await prisma.report.update({
      where: { id: reportId },
      data:  { status: "ERROR" },
    });

    await recordAudit({
      tableName:   "reports",
      recordId:    reportId,
      action:      "DELETE",
      changedById: adminId,
      oldValue:    report.status,
      newValue:    "ERROR",
    });
  }
}
