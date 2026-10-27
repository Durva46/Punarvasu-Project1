/**
 * backend/src/modules/settings/routes.ts
 *
 * Laboratory & App Settings Management API:
 * 1. GET/PUT /api/v1/settings/media      - MediaMaster rows (e.g. quantity per tube)
 * 2. GET/PUT /api/v1/settings/formulas   - MediaFormula rows (expression text validated before save)
 * 3. GET/PUT /api/v1/settings/controls   - Positive & Negative control configuration
 * 4. GET/PUT /api/v1/settings/thresholds - Low stock threshold in grams
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { requirePermission, ADMIN_ONLY, ANY_ACTIVE } from "../../lib/permissions";
import { sendData, sendError, Err } from "../../lib/errors";
import { recordAudit } from "../../lib/audit";
import { evaluateFormula } from "../media/formulaParser";
import { Prisma } from "@prisma/client";

export const settingsRouter = Router();

// ── 1. Media Master Settings ────────────────────────────────────────────────
settingsRouter.get(
  "/media",
  requirePermission(...ANY_ACTIVE),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const media = await prisma.mediaMaster.findMany({
        orderBy: { displayOrder: "asc" },
      });
      sendData(res, media);
    } catch (err) {
      sendError(res, err, req);
    }
  }
);

settingsRouter.put(
  "/media/:id",
  requirePermission(...ADMIN_ONLY),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        sendError(res, Err.unauthorized(), req);
        return;
      }
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const schema = z.object({
        quantity_per_tube: z.number().nullable().optional(),
        active: z.boolean().optional(),
      });
      const body = schema.parse(req.body);

      const existing = await prisma.mediaMaster.findUnique({ where: { id } });
      if (!existing) {
        sendError(res, Err.notFound("MediaMaster"), req);
        return;
      }

      const updated = await prisma.mediaMaster.update({
        where: { id },
        data: {
          quantityPerTube: body.quantity_per_tube !== undefined
            ? (body.quantity_per_tube === null ? null : new Prisma.Decimal(body.quantity_per_tube))
            : existing.quantityPerTube,
          active: body.active !== undefined ? body.active : existing.active,
        },
      });

      await recordAudit({
        tableName: "media_master",
        recordId: id,
        action: "UPDATE_MEDIA_MASTER",
        changedById: req.user.id,
        oldValue: JSON.stringify({ quantityPerTube: existing.quantityPerTube, active: existing.active }),
        newValue: JSON.stringify({ quantityPerTube: updated.quantityPerTube, active: updated.active }),
      });

      sendData(res, updated);
    } catch (err) {
      sendError(res, err, req);
    }
  }
);

// ── 2. Formula Settings ─────────────────────────────────────────────────────
settingsRouter.get(
  "/formulas",
  requirePermission(...ANY_ACTIVE),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const formulas = await prisma.mediaFormula.findMany({
        orderBy: { formulaKey: "asc" },
      });
      sendData(res, formulas);
    } catch (err) {
      sendError(res, err, req);
    }
  }
);

settingsRouter.put(
  "/formulas/:id",
  requirePermission(...ADMIN_ONLY),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        sendError(res, Err.unauthorized(), req);
        return;
      }
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const schema = z.object({
        expression_text: z.string().min(1),
        notes: z.string().optional(),
      });
      const body = schema.parse(req.body);

      // Validate formula expression through parser before saving
      try {
        evaluateFormula(body.expression_text, { S: 5, W: 2, N: 3 });
      } catch (err: any) {
        throw Err.validation(`Formula validation failed: ${err.message}`);
      }

      const existing = await prisma.mediaFormula.findUnique({ where: { id } });
      if (!existing) {
        sendError(res, Err.notFound("MediaFormula"), req);
        return;
      }

      const updated = await prisma.mediaFormula.update({
        where: { id },
        data: {
          expressionText: body.expression_text,
          notes: body.notes !== undefined ? body.notes : existing.notes,
          updatedById: req.user.id,
        },
      });

      await recordAudit({
        tableName: "media_formulas",
        recordId: id,
        action: "UPDATE_FORMULA",
        changedById: req.user.id,
        oldValue: existing.expressionText,
        newValue: updated.expressionText,
      });

      sendData(res, updated);
    } catch (err) {
      sendError(res, err, req);
    }
  }
);

// ── 3. Control Configuration ────────────────────────────────────────────────
settingsRouter.get(
  "/controls",
  requirePermission(...ANY_ACTIVE),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const ctrl = await prisma.controlConfig.findFirst();
      sendData(res, ctrl ?? { positiveControl: 1, negativeControl: 1 });
    } catch (err) {
      sendError(res, err, req);
    }
  }
);

settingsRouter.put(
  "/controls",
  requirePermission(...ADMIN_ONLY),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        sendError(res, Err.unauthorized(), req);
        return;
      }
      const schema = z.object({
        positive_control: z.number().int().min(0),
        negative_control: z.number().int().min(0),
      });
      const body = schema.parse(req.body);

      let ctrl = await prisma.controlConfig.findFirst();
      if (!ctrl) {
        ctrl = await prisma.controlConfig.create({
          data: {
            positiveControl: body.positive_control,
            negativeControl: body.negative_control,
            updatedById: req.user.id,
          },
        });
      } else {
        ctrl = await prisma.controlConfig.update({
          where: { id: ctrl.id },
          data: {
            positiveControl: body.positive_control,
            negativeControl: body.negative_control,
            updatedById: req.user.id,
          },
        });
      }

      await recordAudit({
        tableName: "control_config",
        recordId: ctrl.id,
        action: "UPDATE_CONTROLS",
        changedById: req.user.id,
        newValue: JSON.stringify(body),
      });

      sendData(res, ctrl);
    } catch (err) {
      sendError(res, err, req);
    }
  }
);

// ── 4. Low Stock Threshold ──────────────────────────────────────────────────
settingsRouter.get(
  "/thresholds",
  requirePermission(...ANY_ACTIVE),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const setting = await prisma.appSetting.findUnique({
        where: { key: "low_stock_threshold_gm" },
      });
      sendData(res, { low_stock_threshold_gm: setting ? parseFloat(setting.value) : 10 });
    } catch (err) {
      sendError(res, err, req);
    }
  }
);

settingsRouter.put(
  "/thresholds",
  requirePermission(...ADMIN_ONLY),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        sendError(res, Err.unauthorized(), req);
        return;
      }
      const schema = z.object({
        low_stock_threshold_gm: z.number().positive(),
      });
      const { low_stock_threshold_gm } = schema.parse(req.body);

      const updated = await prisma.appSetting.upsert({
        where: { key: "low_stock_threshold_gm" },
        create: {
          key: "low_stock_threshold_gm",
          value: String(low_stock_threshold_gm),
          updatedById: req.user.id,
        },
        update: {
          value: String(low_stock_threshold_gm),
          updatedById: req.user.id,
        },
      });

      await recordAudit({
        tableName: "app_settings",
        recordId: "low_stock_threshold_gm",
        action: "UPDATE_THRESHOLD",
        changedById: req.user.id,
        newValue: String(low_stock_threshold_gm),
      });

      sendData(res, { low_stock_threshold_gm: parseFloat(updated.value) });
    } catch (err) {
      sendError(res, err, req);
    }
  }
);
