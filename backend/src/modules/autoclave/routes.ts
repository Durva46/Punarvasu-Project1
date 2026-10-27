/**
 * backend/src/modules/autoclave/routes.ts
 *
 * Autoclave API endpoints strictly implementing Phase 4 specification:
 * 1. POST  /api/v1/autoclave/generate
 * 2. GET   /api/v1/autoclave/entries
 * 3. POST  /api/v1/autoclave/entries
 * 4. PATCH /api/v1/autoclave/entries/:id
 * 5. POST  /api/v1/autoclave/entries/:id/reset-end-time
 * 6. POST  /api/v1/autoclave/entries/:id/submit-for-verification
 * 7. POST  /api/v1/autoclave/entries/:id/verify
 *    POST  /api/v1/autoclave/entries/:id/reject-verification
 * 8. GET   /api/v1/autoclave/entries/:id/history
 * 9. GET   /api/v1/autoclave/summary
 * 10. GET  /api/v1/autoclave/settings
 *     PUT  /api/v1/autoclave/settings
 *     GET/PUT /api/v1/autoclave/equipment
 *     GET/POST/PATCH /api/v1/autoclave/load-types
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import {
  requirePermission,
  ADMIN_ANALYST,
  VERIFIER_ADMIN,
  ADMIN_ONLY,
  ANY_ACTIVE,
} from "../../lib/permissions";
import { sendData, sendPage, sendError, Err } from "../../lib/errors";
import { AutoclaveService } from "./service";
import { AutoclaveCleaningService } from "./cleaningService";
import { prisma } from "../../lib/prisma";

export const autoclaveRouter = Router();
const service = new AutoclaveService();
const cleaningService = new AutoclaveCleaningService();

// ── 1. POST /api/v1/autoclave/generate ───────────────────────────────────────
autoclaveRouter.post(
  "/generate",
  requirePermission(...ADMIN_ANALYST),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { report_id } = z.object({ report_id: z.string().min(1) }).parse(req.body);
      if (!req.user) {
        sendError(res, Err.unauthorized(), req);
        return;
      }

      const result = await service.generateForReport(report_id, req.user.id);
      sendData(res, result, 201);
    } catch (err) {
      sendError(res, err, req);
    }
  }
);

// ── 2. GET /api/v1/autoclave/entries ─────────────────────────────────────────
autoclaveRouter.get(
  "/entries",
  requirePermission(...ANY_ACTIVE),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const schema = z.object({
        report_id: z.string().optional(),
        month: z.string().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        search: z.string().optional(),
        sort: z.string().optional(),
        dir: z.enum(["asc", "desc"]).optional(),
        page: z.coerce.number().int().min(1).optional(),
        page_size: z.coerce.number().int().min(1).max(200).optional(),
      });

      const query = schema.parse(req.query);
      const { data, total } = await service.listEntries(query);
      sendPage(res, data, {
        page: query.page ?? 1,
        pageSize: query.page_size ?? 25,
        total,
      });
    } catch (err) {
      sendError(res, err, req);
    }
  }
);

// ── 3. POST /api/v1/autoclave/entries (Manual Extra Entry) ───────────────────
autoclaveRouter.post(
  "/entries",
  requirePermission(...ADMIN_ANALYST),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const schema = z.object({
        report_id: z.string().min(1),
        load_type_id: z.string().min(1),
        log_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
        load_description: z.string().min(1),
      });

      const body = schema.parse(req.body);
      if (!req.user) {
        sendError(res, Err.unauthorized(), req);
        return;
      }

      const entry = await service.createManualEntry(body, req.user.id);
      sendData(res, entry, 201);
    } catch (err) {
      sendError(res, err, req);
    }
  }
);

// ── 4. PATCH /api/v1/autoclave/entries/:id ───────────────────────────────────
autoclaveRouter.patch(
  "/entries/:id",
  requirePermission(...ADMIN_ANALYST),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        sendError(res, Err.unauthorized(), req);
        return;
      }

      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const updated = await service.updateEntry(id, req.body, req.user);
      sendData(res, updated);
    } catch (err) {
      sendError(res, err, req);
    }
  }
);

// ── 5. POST /api/v1/autoclave/entries/:id/reset-end-time ─────────────────────
autoclaveRouter.post(
  "/entries/:id/reset-end-time",
  requirePermission(...ADMIN_ANALYST),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        sendError(res, Err.unauthorized(), req);
        return;
      }
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const updated = await service.resetEndTime(id, req.user.id);
      sendData(res, updated);
    } catch (err) {
      sendError(res, err, req);
    }
  }
);

// ── 6. POST /api/v1/autoclave/entries/:id/submit-for-verification ────────────
autoclaveRouter.post(
  "/entries/:id/submit-for-verification",
  requirePermission(...ADMIN_ANALYST),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        sendError(res, Err.unauthorized(), req);
        return;
      }
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const updated = await service.submitForVerification(id, req.user.id);
      sendData(res, updated);
    } catch (err) {
      sendError(res, err, req);
    }
  }
);

// ── 7. POST /api/v1/autoclave/entries/:id/verify ─────────────────────────────
autoclaveRouter.post(
  "/entries/:id/verify",
  requirePermission(...VERIFIER_ADMIN),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        sendError(res, Err.unauthorized(), req);
        return;
      }

      const schema = z.object({
        actual_temperature_c: z.number().min(0).max(200),
        actual_pressure_value: z.number().positive(),
        actual_start_time: z.string(),
        actual_end_time: z.string(),
        actual_pressure_unit: z.string().optional(),
        notes: z.string().optional(),
      });

      const body = schema.parse(req.body);
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const verified = await service.verifyEntry(id, body, req.user);
      sendData(res, verified);
    } catch (err) {
      sendError(res, err, req);
    }
  }
);

autoclaveRouter.post(
  "/entries/:id/reject-verification",
  requirePermission(...VERIFIER_ADMIN),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        sendError(res, Err.unauthorized(), req);
        return;
      }

      const schema = z.object({ reason: z.string().min(1) });
      const { reason } = schema.parse(req.body);

      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const rejected = await service.rejectVerification(id, reason, req.user);
      sendData(res, rejected);
    } catch (err) {
      sendError(res, err, req);
    }
  }
);

// ── 8. GET /api/v1/autoclave/entries/:id/history ─────────────────────────────
autoclaveRouter.get(
  "/entries/:id/history",
  requirePermission(...ANY_ACTIVE),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const history = await service.getEntryHistory(id);
      sendData(res, history);
    } catch (err) {
      sendError(res, err, req);
    }
  }
);

// ── 9. GET /api/v1/autoclave/summary ─────────────────────────────────────────
autoclaveRouter.get(
  "/summary",
  requirePermission(...ANY_ACTIVE),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const report_id = req.query.report_id as string | undefined;
      const month = req.query.month as string | undefined;
      const summary = await service.getSummary({ report_id, month });
      sendData(res, summary);
    } catch (err) {
      sendError(res, err, req);
    }
  }
);

// ── 10. Settings & Masters ───────────────────────────────────────────────────
// ── 11. Cleaning Schedule (Phase 6) ───────────────────────────────────────────
autoclaveRouter.post(
  "/cleaning/generate",
  requirePermission(...ADMIN_ANALYST),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const schema = z.object({
        month: z.string().regex(/^\d{4}-\d{2}$/, "Must be YYYY-MM"),
        equipment_id: z.string().optional(),
      });
      const body = schema.parse(req.body);
      const result = await cleaningService.generateSchedule(
        body.month,
        body.equipment_id,
        req.user?.id
      );
      sendData(res, result, 201);
    } catch (err) {
      sendError(res, err, req);
    }
  }
);

autoclaveRouter.get(
  "/cleaning",
  requirePermission(...ANY_ACTIVE),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const schema = z.object({
        month: z.string().regex(/^\d{4}-\d{2}$/, "Must be YYYY-MM"),
        equipment_id: z.string().optional(),
      });
      const query = schema.parse(req.query);
      const result = await cleaningService.listSchedule(query.month, query.equipment_id);
      sendData(res, result);
    } catch (err) {
      sendError(res, err, req);
    }
  }
);

autoclaveRouter.post(
  "/cleaning/:id/complete",
  requirePermission(...ANY_ACTIVE),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const schema = z.object({
        actual_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
        done_by: z.string().optional(),
        notes: z.string().optional(),
      });
      const body = schema.parse(req.body);
      if (!req.user) {
        sendError(res, Err.unauthorized(), req);
        return;
      }
      const updated = await cleaningService.completeCleaning(id, body, {
        id: req.user.id,
        role: req.user.role,
      });
      sendData(res, updated);
    } catch (err) {
      sendError(res, err, req);
    }
  }
);

autoclaveRouter.post(
  "/cleaning/:id/reopen",
  requirePermission(...VERIFIER_ADMIN),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const schema = z.object({
        reason: z.string().min(1, "Reason is required"),
      });
      const body = schema.parse(req.body);
      if (!req.user) {
        sendError(res, Err.unauthorized(), req);
        return;
      }
      const updated = await cleaningService.reopenCleaning(id, body.reason, {
        id: req.user.id,
        role: req.user.role,
      });
      sendData(res, updated);
    } catch (err) {
      sendError(res, err, req);
    }
  }
);

autoclaveRouter.get(
  "/cleaning/:id/history",
  requirePermission(...ANY_ACTIVE),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const history = await cleaningService.getHistory(id);
      sendData(res, history);
    } catch (err) {
      sendError(res, err, req);
    }
  }
);

// ── 10. Settings & Masters ───────────────────────────────────────────────────
autoclaveRouter.get(
  "/settings",
  requirePermission(...ANY_ACTIVE),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const settings = await service.getLatestSettingsSnapshot();
      sendData(res, { settings, pendingConfirmation: [] });
    } catch (err) {
      sendError(res, err, req);
    }
  }
);

autoclaveRouter.put(
  "/settings",
  requirePermission(...ADMIN_ONLY),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        sendError(res, Err.unauthorized(), req);
        return;
      }
      const updated = await service.updateSettings(req.body, req.user.id);
      sendData(res, updated);
    } catch (err) {
      sendError(res, err, req);
    }
  }
);

autoclaveRouter.get(
  "/equipment",
  requirePermission(...ANY_ACTIVE),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const equip = await prisma.autoclaveEquipment.findMany();
      sendData(res, equip);
    } catch (err) {
      sendError(res, err, req);
    }
  }
);

autoclaveRouter.get(
  "/load-types",
  requirePermission(...ANY_ACTIVE),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const loadTypes = await prisma.loadType.findMany({
        orderBy: { displayOrder: "asc" },
      });
      sendData(res, loadTypes);
    } catch (err) {
      sendError(res, err, req);
    }
  }
);
