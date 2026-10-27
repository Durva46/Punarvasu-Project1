/**
 * backend/src/modules/media/routes.ts
 *
 * Media Preparation API Endpoints (Phase 3 - Step 1 Corrections).
 * 1. POST /api/v1/media/process                - Process sample dates & calculate ledger
 * 2. POST /api/v1/media/opening-balance/initial- Initial opening balance for all media (allowed once)
 * 3. POST /api/v1/media/opening-balance/edit   - Edit balance for specific media/date with cascade
 * 4. POST /api/v1/media/refill                 - Submit refill for blocked row
 * 5. POST /api/v1/media/override-quantity      - Manual quantity override
 * 6. GET  /api/v1/media/records                - Detailed header & preparation rows
 * 7. GET  /api/v1/media/inventory              - Current balance & status per media
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { requirePermission, ADMIN_ANALYST, ANY_ACTIVE } from "../../lib/permissions";
import { sendData, sendError, Err } from "../../lib/errors";
import { MediaService } from "./service";

export const mediaRouter = Router();
const service = new MediaService();

// ── 1. POST /api/v1/media/process ───────────────────────────────────────────
mediaRouter.post(
  "/process",
  requirePermission(...ADMIN_ANALYST),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        sendError(res, Err.unauthorized(), req);
        return;
      }
      const schema = z.object({
        report_id: z.string().min(1),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD").optional(),
      });
      const { report_id, date } = schema.parse(req.body);

      const result = await service.processReport(report_id, req.user.id, date);
      sendData(res, result, 200);
    } catch (err) {
      sendError(res, err, req);
    }
  }
);

// ── 2. POST /api/v1/media/opening-balance/initial ───────────────────────────
mediaRouter.post(
  "/opening-balance/initial",
  requirePermission(...ADMIN_ANALYST),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        sendError(res, Err.unauthorized(), req);
        return;
      }
      const schema = z.object({
        report_id: z.string().min(1),
        opening_balance_gm: z.number().nonnegative(),
      });
      const body = schema.parse(req.body);

      const result = await service.setInitialOpeningBalance({
        reportId: body.report_id,
        openingBalanceGm: body.opening_balance_gm,
        userId: req.user.id,
      });

      sendData(res, result, 201);
    } catch (err) {
      sendError(res, err, req);
    }
  }
);

// ── 3. POST /api/v1/media/opening-balance/edit ──────────────────────────────
mediaRouter.post(
  "/opening-balance/edit",
  requirePermission(...ADMIN_ANALYST),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        sendError(res, Err.unauthorized(), req);
        return;
      }
      const schema = z.object({
        report_id: z.string().min(1),
        media_id: z.string().min(1),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
        new_opening_balance_gm: z.number().nonnegative(),
        reason: z.string().min(1, "Reason is required"),
      });
      const body = schema.parse(req.body);

      const result = await service.editOpeningBalance({
        reportId: body.report_id,
        mediaId: body.media_id,
        date: body.date,
        newOpeningBalanceGm: body.new_opening_balance_gm,
        reason: body.reason,
        userId: req.user.id,
      });

      sendData(res, result, 200);
    } catch (err) {
      sendError(res, err, req);
    }
  }
);

// ── 4. POST /api/v1/media/refill ────────────────────────────────────────────
mediaRouter.post(
  "/refill",
  requirePermission(...ADMIN_ANALYST),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        sendError(res, Err.unauthorized(), req);
        return;
      }
      const schema = z.object({
        media_prep_record_id: z.string().min(1),
        new_opening_balance_gm: z.number().nonnegative(),
        reason: z.string().min(1, "Reason is required"),
      });
      const body = schema.parse(req.body);

      const result = await service.refillMedia({
        mediaPrepRecordId: body.media_prep_record_id,
        newOpeningBalanceGm: body.new_opening_balance_gm,
        reason: body.reason,
        userId: req.user.id,
      });

      sendData(res, result, 200);
    } catch (err) {
      sendError(res, err, req);
    }
  }
);

// ── 5. POST /api/v1/media/override-quantity ──────────────────────────────────
mediaRouter.post(
  "/override-quantity",
  requirePermission(...ADMIN_ANALYST),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        sendError(res, Err.unauthorized(), req);
        return;
      }
      const schema = z.object({
        media_prep_record_id: z.string().min(1),
        quantity_used_gm: z.number().nonnegative(),
        reason: z.string().min(1, "Reason is required"),
      });
      const body = schema.parse(req.body);

      const result = await service.overrideQuantity({
        mediaPrepRecordId: body.media_prep_record_id,
        quantityUsedGm: body.quantity_used_gm,
        reason: body.reason,
        userId: req.user.id,
      });

      sendData(res, result, 200);
    } catch (err) {
      sendError(res, err, req);
    }
  }
);

// ── 6. GET /api/v1/media/records?report_id&date ──────────────────────────────
mediaRouter.get(
  "/records",
  requirePermission(...ANY_ACTIVE),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const reportId = req.query.report_id as string;
      const date = req.query.date as string | undefined;

      if (!reportId) {
        sendError(res, Err.validation("report_id is required"), req);
        return;
      }

      const result = await service.getRecords(reportId, date);
      sendData(res, result);
    } catch (err) {
      sendError(res, err, req);
    }
  }
);

// ── 7. GET /api/v1/media/inventory?report_id ────────────────────────────────
mediaRouter.get(
  "/inventory",
  requirePermission(...ANY_ACTIVE),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const reportId = req.query.report_id as string;
      if (!reportId) {
        sendError(res, Err.validation("report_id is required"), req);
        return;
      }

      const result = await service.getInventory(reportId);
      sendData(res, result);
    } catch (err) {
      sendError(res, err, req);
    }
  }
);
