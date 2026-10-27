/**
 * backend/src/modules/exports/routes.ts
 *
 * Export API routes implementing Phase 7 specification:
 * - GET /api/v1/final-review?month
 * - GET /api/v1/exports/media?month&format=xlsx|pdf
 * - GET /api/v1/exports/autoclave?month&format=xlsx|pdf
 * - GET /api/v1/exports/package?month&format=xlsx|pdf
 * - GET /api/v1/exports/print-data?month&part=media|autoclave|package
 * - GET /api/v1/exports/log?month
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { requirePermission, ANY_ACTIVE } from "../../lib/permissions";
import { sendData, sendError, Err } from "../../lib/errors";
import { ExportService } from "./service";

export const exportsRouter = Router();
const service = new ExportService();

// ── GET /api/v1/final-review?month ──────────────────────────────────────────
exportsRouter.get(
  "/final-review",
  requirePermission(...ANY_ACTIVE),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const month = String(req.query.month || "");
      if (!/^\d{4}-\d{2}$/.test(month)) {
        throw Err.validation("month is required and must be YYYY-MM");
      }
      const summary = await service.getFinalReviewSummary(month);
      sendData(res, summary);
    } catch (err) {
      sendError(res, err, req);
    }
  }
);

// ── GET /api/v1/exports/media?month&format=xlsx|pdf ─────────────────────────
exportsRouter.get(
  "/exports/media",
  requirePermission(...ANY_ACTIVE),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const schema = z.object({
        month: z.string().regex(/^\d{4}-\d{2}$/, "Must be YYYY-MM"),
        format: z.enum(["xlsx", "pdf"]).default("xlsx"),
      });
      const query = schema.parse(req.query);
      if (!req.user) {
        sendError(res, Err.unauthorized(), req);
        return;
      }

      const fileName = `Media_Preparation_Record_${query.month}.${query.format}`;
      const contentType =
        query.format === "xlsx"
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "application/pdf";

      let buffer: Buffer;
      if (query.format === "xlsx") {
        buffer = await service.generateExcel(query.month, "media", req.user);
      } else {
        buffer = await service.generatePdf(query.month, "media", req.user);
      }

      await service.logExport(`MEDIA_${query.format.toUpperCase()}`, query.month, req.user);

      const delivery = await service.deliverExport(buffer, fileName, contentType);
      if (!delivery.direct && delivery.signedUrl) {
        res.json({ data: { signedUrl: delivery.signedUrl, fileName } });
        return;
      }

      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      res.send(delivery.buffer);
    } catch (err) {
      sendError(res, err, req);
    }
  }
);

// ── GET /api/v1/exports/autoclave?month&format=xlsx|pdf ─────────────────────
exportsRouter.get(
  "/exports/autoclave",
  requirePermission(...ANY_ACTIVE),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const schema = z.object({
        month: z.string().regex(/^\d{4}-\d{2}$/, "Must be YYYY-MM"),
        format: z.enum(["xlsx", "pdf"]).default("xlsx"),
      });
      const query = schema.parse(req.query);
      if (!req.user) {
        sendError(res, Err.unauthorized(), req);
        return;
      }

      const fileName = `Autoclave_Log_Book_${query.month}.${query.format}`;
      const contentType =
        query.format === "xlsx"
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "application/pdf";

      let buffer: Buffer;
      if (query.format === "xlsx") {
        buffer = await service.generateExcel(query.month, "autoclave", req.user);
      } else {
        buffer = await service.generatePdf(query.month, "autoclave", req.user);
      }

      await service.logExport(`AUTOCLAVE_${query.format.toUpperCase()}`, query.month, req.user);

      const delivery = await service.deliverExport(buffer, fileName, contentType);
      if (!delivery.direct && delivery.signedUrl) {
        res.json({ data: { signedUrl: delivery.signedUrl, fileName } });
        return;
      }

      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      res.send(delivery.buffer);
    } catch (err) {
      sendError(res, err, req);
    }
  }
);

// ── GET /api/v1/exports/package?month&format=xlsx|pdf ───────────────────────
exportsRouter.get(
  "/exports/package",
  requirePermission(...ANY_ACTIVE),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const schema = z.object({
        month: z.string().regex(/^\d{4}-\d{2}$/, "Must be YYYY-MM"),
        format: z.enum(["xlsx", "pdf"]).default("xlsx"),
      });
      const query = schema.parse(req.query);
      if (!req.user) {
        sendError(res, Err.unauthorized(), req);
        return;
      }

      const fileName = `Monthly_Package_${query.month}.${query.format}`;
      const contentType =
        query.format === "xlsx"
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "application/pdf";

      let buffer: Buffer;
      if (query.format === "xlsx") {
        buffer = await service.generateExcel(query.month, "package", req.user);
      } else {
        buffer = await service.generatePdf(query.month, "package", req.user);
      }

      await service.logExport(`PACKAGE_${query.format.toUpperCase()}`, query.month, req.user);

      const delivery = await service.deliverExport(buffer, fileName, contentType);
      if (!delivery.direct && delivery.signedUrl) {
        res.json({ data: { signedUrl: delivery.signedUrl, fileName } });
        return;
      }

      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      res.send(delivery.buffer);
    } catch (err) {
      sendError(res, err, req);
    }
  }
);

// ── GET /api/v1/exports/print-data?month&part=media|autoclave|package ───────
exportsRouter.get(
  "/exports/print-data",
  requirePermission(...ANY_ACTIVE),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const schema = z.object({
        month: z.string().regex(/^\d{4}-\d{2}$/, "Must be YYYY-MM"),
        part: z.enum(["media", "autoclave", "package"]).default("package"),
      });
      const query = schema.parse(req.query);

      let mediaRows: any[] = [];
      let autoclaveData: any = null;

      if (query.part === "media" || query.part === "package") {
        mediaRows = await service.getMediaExportData(query.month);
      }
      if (query.part === "autoclave" || query.part === "package") {
        autoclaveData = await service.getAutoclaveExportData(query.month);
      }

      sendData(res, {
        reportingMonth: query.month,
        part: query.part,
        mediaRows,
        autoclaveRows: autoclaveData?.rows || [],
        equipment: autoclaveData?.equipment || null,
        printedBy: req.user?.fullName || "Staff",
      });
    } catch (err) {
      sendError(res, err, req);
    }
  }
);

// ── GET /api/v1/exports/log?month ───────────────────────────────────────────
exportsRouter.get(
  "/exports/log",
  requirePermission(...ANY_ACTIVE),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const month = String(req.query.month || "");
      if (!/^\d{4}-\d{2}$/.test(month)) {
        throw Err.validation("month is required and must be YYYY-MM");
      }
      const logs = await service.listRecentExports(month);
      sendData(res, logs);
    } catch (err) {
      sendError(res, err, req);
    }
  }
);
