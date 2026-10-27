/**
 * backend/src/modules/alerts/routes.ts
 *
 * Alerts Management API:
 * GET   /api/v1/alerts             - List alerts with filters (reportId, alertType, resolved)
 * PATCH /api/v1/alerts/:id/resolve - Resolve an alert with audit tracking
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { requirePermission, ADMIN_ANALYST, ANY_ACTIVE } from "../../lib/permissions";
import { sendData, sendError, Err } from "../../lib/errors";
import { recordAudit } from "../../lib/audit";

export const alertsRouter = Router();

// ── GET /api/v1/alerts ───────────────────────────────────────────────────────
alertsRouter.get(
  "/",
  requirePermission(...ANY_ACTIVE),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const reportId = req.query.report_id as string | undefined;
      const alertType = req.query.alert_type as string | undefined;
      const resolved = req.query.resolved as string | undefined;

      const where: any = {};
      if (reportId) where.reportId = reportId;
      if (alertType) where.alertType = alertType;
      if (resolved !== undefined) where.resolved = resolved === "true";

      const alerts = await prisma.alert.findMany({
        where,
        include: {
          resolvedBy: { select: { fullName: true } },
        },
        orderBy: [{ resolved: "asc" }, { createdAt: "desc" }],
      });

      sendData(
        res,
        alerts.map((a) => ({
          id: a.id,
          reportId: a.reportId,
          alertType: a.alertType,
          severity: a.severity,
          message: a.message,
          relatedTable: a.relatedTable,
          relatedId: a.relatedId,
          resolved: a.resolved,
          resolvedBy: a.resolvedBy?.fullName ?? null,
          resolvedAt: a.resolvedAt,
          createdAt: a.createdAt,
        }))
      );
    } catch (err) {
      sendError(res, err, req);
    }
  }
);

// ── PATCH /api/v1/alerts/:id/resolve ─────────────────────────────────────────
alertsRouter.patch(
  "/:id/resolve",
  requirePermission(...ADMIN_ANALYST),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        sendError(res, Err.unauthorized(), req);
        return;
      }
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      const alert = await prisma.alert.findUnique({ where: { id } });
      if (!alert) {
        sendError(res, Err.notFound("Alert"), req);
        return;
      }

      const updated = await prisma.alert.update({
        where: { id },
        data: {
          resolved: true,
          resolvedById: req.user.id,
          resolvedAt: new Date(),
        },
      });

      await recordAudit({
        tableName: "alerts",
        recordId: id,
        action: "RESOLVE_ALERT",
        changedById: req.user.id,
        oldValue: "false",
        newValue: "true",
      });

      sendData(res, updated);
    } catch (err) {
      sendError(res, err, req);
    }
  }
);
