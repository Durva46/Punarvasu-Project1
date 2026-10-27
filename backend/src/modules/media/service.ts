/**
 * backend/src/modules/media/service.ts
 *
 * Media Preparation Ledger Service (Phase 3 - Step 1 Corrections).
 * Enforces all rules from AGENTS.md §5 and Phase 3 specifications:
 *
 * 1. Process Date(s):
 *    - S (total samples), W (water samples), N (S - W)
 *    - Evaluates expressionText safely via evaluateFormula()
 *    - R2A conditional: generated ONLY when W > 0.
 *      If W becomes 0, removed unless overridden/refilled (in which case kept + warning).
 *    - Dates processed chronologically so opening balances carry forward.
 * 2. Opening balance rules:
 *    - First date takes initial opening balance (POST /api/media/opening-balance/initial).
 *      Allowed once. Flags LOW_STOCK if < threshold (e.g. 10 gm).
 *    - Subsequent dates carry forward previous closing balance.
 *    - If no opening balance: status CALCULATION_BLOCKED, alert MISSING_OPENING_BALANCE.
 *    - If quantity_per_tube is null: status CALCULATION_BLOCKED, alert MISSING_QUANTITY_PER_TUBE.
 *    - If quantity_used > opening_balance: status REFILL_REQUIRED (displayed as CALCULATION BLOCKED)
 *      with shortfall computed; alert REFILL_REQUIRED. Blocks later dates.
 * 3. Editing & Refill:
 *    - Edit opening balance (POST /api/media/opening-balance/edit) requires reason, audited, cascades recalculation.
 *    - Refill (POST /api/media/refill) logs to refill_log, sets source='refill', resolves alert, recalculates forward.
 *    - Override quantity (POST /api/media/override-quantity) requires reason, marks quantity_overridden=true, audited.
 */

import { prisma } from "../../lib/prisma";
import { recordAudit } from "../../lib/audit";
import { Err } from "../../lib/errors";
import { evaluateFormula, calculateQuantityUsed } from "./formulaParser";
import { formatDateDMY } from "../../lib/time";
import { Prisma } from "@prisma/client";

export class MediaService {
  /**
   * Helper: Retrieve low stock threshold from settings (default 10 gm).
   */
  async getLowStockThreshold(): Promise<number> {
    const setting = await prisma.appSetting.findUnique({
      where: { key: "low_stock_threshold_gm" },
    });
    return setting ? parseFloat(setting.value) : 10;
  }

  /**
   * Helper: Retrieve positive and negative control values.
   */
  async getControlConfig() {
    const ctrl = await prisma.controlConfig.findFirst();
    return {
      positiveControl: ctrl?.positiveControl ?? 1,
      negativeControl: ctrl?.negativeControl ?? 1,
    };
  }

  /**
   * 1. POST /api/media/process
   * Reprocesses all or a specific date for a report in chronological order.
   */
  async processReport(reportId: string, performedById: string, targetDateStr?: string) {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        samples: {
          orderBy: { registrationDate: "asc" },
        },
      },
    });
    if (!report) throw Err.notFound("Report");

    // Fetch active media masters in display order
    const mediaMasterList = await prisma.mediaMaster.findMany({
      where: { active: true },
      include: { formula: true },
      orderBy: { displayOrder: "asc" },
    });

    // Group samples by registration date
    const dateMap = new Map<
      string,
      { date: Date; total: number; water: number; sampleNames: string[] }
    >();

    for (const sample of report.samples) {
      const key = sample.registrationDate.toISOString().slice(0, 10);
      if (targetDateStr && key !== targetDateStr) continue;

      const existing = dateMap.get(key) ?? {
        date: sample.registrationDate,
        total: 0,
        water: 0,
        sampleNames: [],
      };
      existing.total++;
      if (sample.isWater) existing.water++;
      if (sample.sampleName && !existing.sampleNames.includes(sample.sampleName)) {
        existing.sampleNames.push(sample.sampleName);
      }
      dateMap.set(key, existing);
    }

    if (dateMap.size === 0) {
      return { totalDatesProcessed: 0, warnings: ["No samples found for processing."] };
    }

    const sortedDates = Array.from(dateMap.values()).sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );

    const threshold = await this.getLowStockThreshold();
    const warnings: string[] = [];

    // Track running balances across dates per media: mediaId -> { balance: number, blocked: boolean }
    const mediaLedger = new Map<string, { balance: number | null; blocked: boolean }>();

    // Seed ledger with earliest known opening balances for this report
    const initialBalances = await prisma.stockOpeningBalance.findMany({
      where: { reportId, source: "initial" },
    });
    for (const b of initialBalances) {
      mediaLedger.set(b.mediaId, {
        balance: Number(b.openingBalanceGm),
        blocked: false,
      });
    }

    // Process dates chronologically
    for (const dateItem of sortedDates) {
      const S = dateItem.total;
      const W = dateItem.water;
      const N = S - W;
      const vars = { S, W, N };

      for (const media of mediaMasterList) {
        // Handle R2A conditional logic
        if (media.isConditional) {
          if (W === 0) {
            // Check if existing record had override or refill
            const existingR2A = await prisma.mediaPreparationRecord.findUnique({
              where: {
                reportId_prepDate_mediaId: {
                  reportId,
                  prepDate: dateItem.date,
                  mediaId: media.id,
                },
              },
              include: { refillLogs: true },
            });

            if (existingR2A) {
              if (existingR2A.quantityOverridden || existingR2A.refillLogs.length > 0) {
                warnings.push(
                  `R2A row on ${formatDateDMY(dateItem.date)} has 0 water samples but was preserved due to user modifications.`
                );
              } else {
                // Delete conditional row cleanly
                await prisma.mediaPreparationRecord.delete({
                  where: { id: existingR2A.id },
                });
                continue;
              }
            } else {
              // Skip R2A when W = 0
              continue;
            }
          }
        }

        // Formula expression evaluation
        const expr = media.formula?.expressionText || "S + 1 + 1";
        let tubePlates = 0;
        try {
          tubePlates = evaluateFormula(expr, vars);
        } catch (err: any) {
          warnings.push(`Failed to evaluate formula for ${media.name}: ${err.message}`);
        }

        // Ledger state
        let ledger = mediaLedger.get(media.id);
        if (!ledger) {
          // Check if there was a manually recorded opening balance for this date
          const explicitSob = await prisma.stockOpeningBalance.findFirst({
            where: { reportId, mediaId: media.id, effectiveDate: dateItem.date },
            orderBy: { createdAt: "desc" },
          });
          ledger = {
            balance: explicitSob ? Number(explicitSob.openingBalanceGm) : null,
            blocked: false,
          };
          mediaLedger.set(media.id, ledger);
        }

        const openingBalance = ledger.balance;
        const currentBlocked = ledger.blocked;

        let status = "READY";
        let quantityUsed: number | null = null;
        let balance: number | null = null;

        // Check if quantity per tube exists
        if (media.quantityPerTube === null) {
          status = "CALCULATION_BLOCKED";
          ledger.blocked = true;

          const alertMsg = `Missing quantity per tube for media "${media.name}".`;
          const exists = await prisma.alert.findFirst({
            where: { reportId, alertType: "MISSING_QUANTITY_PER_TUBE", relatedId: media.id },
          });
          if (!exists) {
            await prisma.alert.create({
              data: {
                reportId,
                alertType: "MISSING_QUANTITY_PER_TUBE",
                severity: "WARNING",
                message: alertMsg,
                relatedTable: "media_master",
                relatedId: media.id,
              },
            });
          }
        } else if (currentBlocked) {
          // Downstream rows for a blocked media stay blocked until refill
          status = "CALCULATION_BLOCKED";
        } else if (openingBalance === null) {
          status = "CALCULATION_BLOCKED";
          ledger.blocked = true;

          const alertMsg = `Opening balance missing for "${media.name}" on ${formatDateDMY(dateItem.date)}.`;
          const exists = await prisma.alert.findFirst({
            where: { reportId, alertType: "MISSING_OPENING_BALANCE", relatedId: media.id },
          });
          if (!exists) {
            await prisma.alert.create({
              data: {
                reportId,
                alertType: "MISSING_OPENING_BALANCE",
                severity: "WARNING",
                message: alertMsg,
                relatedTable: "media_master",
                relatedId: media.id,
              },
            });
          }
        } else {
          // Check if existing record had a quantity override
          const existingRecord = await prisma.mediaPreparationRecord.findUnique({
            where: {
              reportId_prepDate_mediaId: {
                reportId,
                prepDate: dateItem.date,
                mediaId: media.id,
              },
            },
          });

          if (existingRecord?.quantityOverridden && existingRecord.quantityUsedGm !== null) {
            quantityUsed = Number(existingRecord.quantityUsedGm);
          } else {
            const qtyCalc = calculateQuantityUsed(tubePlates, Number(media.quantityPerTube));
            quantityUsed = qtyCalc.storedGm;
          }

          if (quantityUsed !== null && quantityUsed > openingBalance) {
            status = "REFILL_REQUIRED";
            ledger.blocked = true;
            const shortfall = parseFloat((quantityUsed - openingBalance).toFixed(4));

            const alertMsg = `Refill required for "${media.name}" on ${formatDateDMY(dateItem.date)}: Opening ${openingBalance} gm, Required ${quantityUsed} gm, Shortfall ${shortfall} gm.`;
            const existingAlert = await prisma.alert.findFirst({
              where: { reportId, alertType: "REFILL_REQUIRED", relatedId: media.id },
            });
            if (!existingAlert) {
              await prisma.alert.create({
                data: {
                  reportId,
                  alertType: "REFILL_REQUIRED",
                  severity: "ERROR",
                  message: alertMsg,
                  relatedTable: "media_master",
                  relatedId: media.id,
                },
              });
            }
          } else if (quantityUsed !== null) {
            balance = parseFloat((openingBalance - quantityUsed).toFixed(4));
            ledger.balance = balance;

            if (balance < threshold) {
              status = "LOW_STOCK";
              const alertMsg = `Low stock warning for "${media.name}": balance is ${balance} gm (below ${threshold} gm).`;
              const existingAlert = await prisma.alert.findFirst({
                where: { reportId, alertType: "LOW_STOCK", relatedId: media.id },
              });
              if (!existingAlert) {
                await prisma.alert.create({
                  data: {
                    reportId,
                    alertType: "LOW_STOCK",
                    severity: "WARNING",
                    message: alertMsg,
                    relatedTable: "media_master",
                    relatedId: media.id,
                  },
                });
              }
            } else {
              status = "COMPLETE";
            }
          }
        }

        // Upsert record
        await prisma.mediaPreparationRecord.upsert({
          where: {
            reportId_prepDate_mediaId: {
              reportId,
              prepDate: dateItem.date,
              mediaId: media.id,
            },
          },
          create: {
            reportId,
            prepDate: dateItem.date,
            mediaId: media.id,
            samplesCount: S,
            waterCount: W,
            nonWaterCount: N,
            tubePlates,
            formulaText: expr,
            openingBalanceGm: openingBalance !== null ? new Prisma.Decimal(openingBalance) : null,
            quantityUsedGm: quantityUsed !== null ? new Prisma.Decimal(quantityUsed) : null,
            balanceGm: balance !== null ? new Prisma.Decimal(balance) : null,
            status,
            usedIn: dateItem.sampleNames,
            preparedById: performedById,
          },
          update: {
            samplesCount: S,
            waterCount: W,
            nonWaterCount: N,
            tubePlates,
            formulaText: expr,
            openingBalanceGm: openingBalance !== null ? new Prisma.Decimal(openingBalance) : null,
            quantityUsedGm: quantityUsed !== null ? new Prisma.Decimal(quantityUsed) : null,
            balanceGm: balance !== null ? new Prisma.Decimal(balance) : null,
            status,
            usedIn: dateItem.sampleNames,
          },
        });
      }
    }

    await recordAudit({
      tableName: "media_preparation_records",
      recordId: reportId,
      action: "PROCESS_MEDIA",
      changedById: performedById,
      newValue: `Processed ${sortedDates.length} date(s).`,
    });

    return { totalDatesProcessed: sortedDates.length, warnings };
  }

  /**
   * 2. POST /api/media/opening-balance/initial
   * Sets the initial opening balance for ALL active media on the first date.
   * Allowed ONLY ONCE per report.
   */
  async setInitialOpeningBalance(data: {
    reportId: string;
    openingBalanceGm: number;
    userId: string;
  }) {
    const { reportId, openingBalanceGm, userId } = data;
    if (openingBalanceGm < 0) {
      throw Err.businessRule("Opening balance cannot be negative.");
    }

    // Check if initial balance already recorded
    const existing = await prisma.stockOpeningBalance.findFirst({
      where: { reportId, source: "initial" },
    });
    if (existing) {
      throw Err.businessRule(
        "Initial opening balance has already been set for this report. Use the Edit Opening Balance action instead."
      );
    }

    // Find earliest sample registration date
    const firstSample = await prisma.sample.findFirst({
      where: { reportId },
      orderBy: { registrationDate: "asc" },
    });
    if (!firstSample) throw Err.businessRule("Report has no samples.");

    const firstDate = firstSample.registrationDate;
    const mediaList = await prisma.mediaMaster.findMany({ where: { active: true } });

    // Create initial stock balance records for all active media
    await prisma.$transaction(
      mediaList.map((m) =>
        prisma.stockOpeningBalance.create({
          data: {
            reportId,
            mediaId: m.id,
            effectiveDate: firstDate,
            openingBalanceGm: new Prisma.Decimal(openingBalanceGm),
            source: "initial",
            reason: "Initial opening balance entry",
            createdById: userId,
          },
        })
      )
    );

    const threshold = await this.getLowStockThreshold();
    let isBelowThreshold = false;

    if (openingBalanceGm < threshold) {
      isBelowThreshold = true;
      const msg = `Opening balance is below the minimum threshold of ${threshold} gm.`;
      await prisma.alert.create({
        data: {
          reportId,
          alertType: "LOW_STOCK",
          severity: "WARNING",
          message: msg,
          relatedTable: "stock_opening_balances",
        },
      });
    }

    // Recalculate ledger for report
    await this.processReport(reportId, userId);

    await recordAudit({
      tableName: "stock_opening_balances",
      recordId: reportId,
      action: "INITIAL_OPENING_BALANCE",
      changedById: userId,
      newValue: JSON.stringify({ openingBalanceGm, isBelowThreshold }),
    });

    return {
      success: true,
      openingBalanceGm,
      threshold,
      isBelowThreshold,
      message: isBelowThreshold
        ? `Opening balance is below the minimum threshold of ${threshold} gm.`
        : "Initial opening balance recorded successfully.",
    };
  }

  /**
   * 3. POST /api/media/opening-balance/edit
   * Updates a media's opening balance for a date with audit trail & forward recalculation.
   */
  async editOpeningBalance(data: {
    reportId: string;
    mediaId: string;
    date: string;
    newOpeningBalanceGm: number;
    reason: string;
    userId: string;
  }) {
    if (!data.reason || !data.reason.trim()) {
      throw Err.validation("Reason is required to edit opening balance.");
    }
    if (data.newOpeningBalanceGm < 0) {
      throw Err.businessRule("Opening balance cannot be negative.");
    }

    const effectiveDate = new Date(data.date + "T00:00:00Z");

    const sob = await prisma.stockOpeningBalance.create({
      data: {
        reportId: data.reportId,
        mediaId: data.mediaId,
        effectiveDate,
        openingBalanceGm: new Prisma.Decimal(data.newOpeningBalanceGm),
        source: "edit",
        reason: data.reason,
        createdById: data.userId,
      },
    });

    // Recalculate forward
    await this.processReport(data.reportId, data.userId);

    await recordAudit({
      tableName: "stock_opening_balances",
      recordId: sob.id,
      action: "EDIT_OPENING_BALANCE",
      changedById: data.userId,
      reason: data.reason,
      newValue: JSON.stringify({
        mediaId: data.mediaId,
        newOpeningBalanceGm: data.newOpeningBalanceGm,
      }),
    });

    return sob;
  }

  /**
   * 4. POST /api/media/refill
   * Submits a refill for a blocked record, calculates shortfall, logs to refill_log,
   * resolves related alerts, and recalculates forward.
   */
  async refillMedia(data: {
    mediaPrepRecordId: string;
    newOpeningBalanceGm: number;
    reason: string;
    userId: string;
  }) {
    if (!data.reason || !data.reason.trim()) {
      throw Err.validation("Reason is required to submit a refill.");
    }

    const record = await prisma.mediaPreparationRecord.findUnique({
      where: { id: data.mediaPrepRecordId },
      include: { media: true },
    });
    if (!record) throw Err.notFound("MediaPreparationRecord");

    const previousOpening = record.openingBalanceGm ? Number(record.openingBalanceGm) : 0;
    const requiredQty = record.quantityUsedGm ? Number(record.quantityUsedGm) : 0;
    const shortfall = parseFloat(Math.max(0, requiredQty - previousOpening).toFixed(4));

    if (data.newOpeningBalanceGm < requiredQty) {
      throw Err.businessRule(
        `New opening balance (${data.newOpeningBalanceGm} gm) must be at least the required quantity (${requiredQty} gm).`
      );
    }

    // Create refill log
    await prisma.refillLog.create({
      data: {
        mediaPrepRecordId: record.id,
        previousOpeningGm: new Prisma.Decimal(previousOpening),
        newOpeningGm: new Prisma.Decimal(data.newOpeningBalanceGm),
        shortfallGm: new Prisma.Decimal(shortfall),
        reason: data.reason,
        createdById: data.userId,
      },
    });

    // Record stock opening balance with source 'refill'
    await prisma.stockOpeningBalance.create({
      data: {
        reportId: record.reportId,
        mediaId: record.mediaId,
        effectiveDate: record.prepDate,
        openingBalanceGm: new Prisma.Decimal(data.newOpeningBalanceGm),
        source: "refill",
        reason: data.reason,
        createdById: data.userId,
      },
    });

    // Resolve REFILL_REQUIRED alert if present
    await prisma.alert.updateMany({
      where: {
        reportId: record.reportId,
        alertType: "REFILL_REQUIRED",
        relatedId: record.mediaId,
        resolved: false,
      },
      data: {
        resolved: true,
        resolvedById: data.userId,
        resolvedAt: new Date(),
      },
    });

    // Recalculate forward
    await this.processReport(record.reportId, data.userId);

    await recordAudit({
      tableName: "media_preparation_records",
      recordId: record.id,
      action: "REFILL",
      changedById: data.userId,
      reason: data.reason,
      newValue: JSON.stringify({
        newOpeningBalanceGm: data.newOpeningBalanceGm,
        shortfall,
      }),
    });

    return { success: true, shortfall };
  }

  /**
   * 5. POST /api/media/override-quantity
   */
  async overrideQuantity(data: {
    mediaPrepRecordId: string;
    quantityUsedGm: number;
    reason: string;
    userId: string;
  }) {
    if (!data.reason || !data.reason.trim()) {
      throw Err.validation("Reason is required to override quantity.");
    }
    if (data.quantityUsedGm < 0) {
      throw Err.businessRule("Quantity cannot be negative.");
    }

    const record = await prisma.mediaPreparationRecord.findUnique({
      where: { id: data.mediaPrepRecordId },
    });
    if (!record) throw Err.notFound("MediaPreparationRecord");

    const opening = record.openingBalanceGm ? Number(record.openingBalanceGm) : 0;
    const balance = parseFloat(Math.max(0, opening - data.quantityUsedGm).toFixed(4));
    const threshold = await this.getLowStockThreshold();

    let status = record.status;
    if (data.quantityUsedGm > opening) {
      status = "REFILL_REQUIRED";
    } else if (balance < threshold) {
      status = "LOW_STOCK";
    } else {
      status = "COMPLETE";
    }

    const updated = await prisma.mediaPreparationRecord.update({
      where: { id: data.mediaPrepRecordId },
      data: {
        quantityUsedGm: new Prisma.Decimal(data.quantityUsedGm),
        quantityOverridden: true,
        overrideReason: data.reason,
        balanceGm: new Prisma.Decimal(balance),
        status,
      },
    });

    await recordAudit({
      tableName: "media_preparation_records",
      recordId: record.id,
      action: "OVERRIDE_QUANTITY",
      changedById: data.userId,
      reason: data.reason,
      oldValue: String(record.quantityUsedGm),
      newValue: String(data.quantityUsedGm),
    });

    return updated;
  }

  /**
   * 6. GET /api/media/records?report_id&date
   */
  async getRecords(reportId: string, dateStr?: string) {
    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw Err.notFound("Report");

    const controls = await this.getControlConfig();
    const threshold = await this.getLowStockThreshold();

    let targetDate: Date | null = null;
    if (dateStr) {
      targetDate = new Date(dateStr + "T00:00:00Z");
    } else {
      // Default to first sample registration date
      const firstSample = await prisma.sample.findFirst({
        where: { reportId },
        orderBy: { registrationDate: "asc" },
      });
      if (firstSample) targetDate = firstSample.registrationDate;
    }

    // Daily counts for header
    let S = 0;
    let W = 0;
    let N = 0;

    if (targetDate) {
      const samples = await prisma.sample.findMany({
        where: { reportId, registrationDate: targetDate },
      });
      S = samples.length;
      W = samples.filter((s) => s.isWater).length;
      N = S - W;
    }

    const where: Prisma.MediaPreparationRecordWhereInput = { reportId };
    if (targetDate) where.prepDate = targetDate;

    const records = await prisma.mediaPreparationRecord.findMany({
      where,
      include: {
        media: true,
        preparedBy: { select: { fullName: true } },
      },
      orderBy: [
        { prepDate: "asc" },
        { media: { displayOrder: "asc" } },
      ],
    });

    // Check if initial opening balance prompt should be shown
    const initialSob = await prisma.stockOpeningBalance.findFirst({
      where: { reportId, source: "initial" },
    });
    const requiresInitialBalance = !initialSob;

    const rows = records.map((r) => {
      const opening = r.openingBalanceGm ? Number(r.openingBalanceGm) : null;
      const used = r.quantityUsedGm ? Number(r.quantityUsedGm) : null;
      const bal = r.balanceGm ? Number(r.balanceGm) : null;

      const isLowStock = r.status === "LOW_STOCK";
      const isRefillRequired = r.status === "REFILL_REQUIRED";
      const isBlocked = r.status === "CALCULATION_BLOCKED" || isRefillRequired;

      return {
        id: r.id,
        mediaId: r.mediaId,
        date: formatDateDMY(r.prepDate),
        isoDate: r.prepDate.toISOString().slice(0, 10),
        mediaName: r.media.name,
        isConditional: r.media.isConditional,
        displayOrder: r.media.displayOrder,
        openingBalanceGm: opening,
        quantityUsedGm: used,
        balanceGm: bal,
        tubePlates: r.tubePlates,
        formulaText: r.formulaText,
        quantityPerTube: r.media.quantityPerTube ? Number(r.media.quantityPerTube) : null,
        unit: r.media.unit,
        usedIn: r.usedIn,
        preparedBy: r.preparedBy?.fullName ?? null,
        status: r.status,
        flags: {
          lowStock: isLowStock,
          refillRequired: isRefillRequired,
          blocked: isBlocked,
          overridden: r.quantityOverridden,
        },
      };
    });

    return {
      header: {
        date: targetDate ? formatDateDMY(targetDate) : null,
        isoDate: targetDate ? targetDate.toISOString().slice(0, 10) : null,
        totalSamples: S,
        waterSamples: W,
        nonWaterSamples: N,
        positiveControl: controls.positiveControl,
        negativeControl: controls.negativeControl,
        lowStockThreshold: threshold,
        requiresInitialBalance,
      },
      rows,
    };
  }

  /**
   * 7. GET /api/media/inventory?report_id
   * Current latest balance per active media.
   */
  async getInventory(reportId: string) {
    const mediaList = await prisma.mediaMaster.findMany({
      where: { active: true },
      orderBy: { displayOrder: "asc" },
    });

    const threshold = await this.getLowStockThreshold();
    const inventory = [];

    for (const m of mediaList) {
      // Find latest record for this media in the report
      const latestRecord = await prisma.mediaPreparationRecord.findFirst({
        where: { reportId, mediaId: m.id },
        orderBy: { prepDate: "desc" },
      });

      const currentBalance = latestRecord?.balanceGm ? Number(latestRecord.balanceGm) : null;
      inventory.push({
        mediaId: m.id,
        mediaName: m.name,
        displayOrder: m.displayOrder,
        unit: m.unit,
        currentBalanceGm: currentBalance,
        status: latestRecord?.status ?? "NO_DATA",
        isLowStock: currentBalance !== null && currentBalance < threshold,
        lastUpdatedDate: latestRecord ? formatDateDMY(latestRecord.prepDate) : null,
      });
    }

    return { threshold, inventory };
  }
}
