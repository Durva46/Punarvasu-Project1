/**
 * backend/src/modules/imports/routes.ts
 *
 * Excel upload and import management routes.
 * POST /api/v1/imports/upload  — upload and parse a monthly Excel file
 * GET  /api/v1/imports         — list all reports
 * GET  /api/v1/imports/:id     — get one report with sample summary
 * GET  /api/v1/imports/:id/samples — paginated sample list with filters
 * DELETE /api/v1/imports/:id   — admin only, soft-deletes (marks ERROR)
 */

import { Router, Request, Response } from "express";
import multer from "multer";
import { z } from "zod";
import { requirePermission, ADMIN_ANALYST, ANY_ACTIVE, ADMIN_ONLY } from "../../lib/permissions";
import { sendData, sendPage, sendError, Err } from "../../lib/errors";
import { env } from "../../config/env";
import { ImportService } from "./service";

export const importsRouter = Router();
const service = new ImportService();

// ── Multer — memory storage (we parse in-memory, never write to disk) ───────
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: env.MAX_UPLOAD_BYTES },
  fileFilter: (_req, file, cb) => {
    const ok = file.mimetype.includes("spreadsheet") ||
                file.mimetype.includes("excel") ||
                file.originalname.endsWith(".xlsx") ||
                file.originalname.endsWith(".xls");
    cb(null, ok);
    if (!ok) cb(new Error("Only Excel files (.xlsx, .xls) are accepted"));
  },
});

// ── Zod schemas ───────────────────────────────────────────────────────────────
const SamplesQuerySchema = z.object({
  page:        z.coerce.number().int().min(1).default(1),
  page_size:   z.coerce.number().int().min(1).max(200).default(50),
  date:        z.string().optional(),   // filter by registrationDate (YYYY-MM-DD)
  search:      z.string().optional(),   // search sampleName or sampleIdentifier
  is_water:    z.enum(["true","false"]).optional(),
  sort:        z.enum(["registrationDate","sampleName","sampleIdentifier","createdAt"]).default("registrationDate"),
  dir:         z.enum(["asc","desc"]).default("asc"),
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/imports/upload
// ─────────────────────────────────────────────────────────────────────────────
importsRouter.post(
  "/upload",
  requirePermission(...ADMIN_ANALYST),
  upload.single("file"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        sendError(res, Err.validation("No file uploaded. Send the Excel file as multipart/form-data field 'file'."), req);
        return;
      }
      if (!req.user) { sendError(res, Err.unauthorized(), req); return; }

      const result = await service.importExcel({
        buffer:     req.file.buffer,
        fileName:   req.file.originalname,
        uploadedBy: req.user.id,
      });

      sendData(res, result, 201);
    } catch (err) {
      sendError(res, err, req);
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/imports
// ─────────────────────────────────────────────────────────────────────────────
importsRouter.get(
  "/",
  requirePermission(...ANY_ACTIVE),
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const reports = await service.listReports();
      sendData(res, reports);
    } catch (err) {
      sendError(res, err, _req);
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/imports/:id
// ─────────────────────────────────────────────────────────────────────────────
importsRouter.get(
  "/:id",
  requirePermission(...ANY_ACTIVE),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const report = await service.getReport(id);
      if (!report) { sendError(res, Err.notFound("Report"), req); return; }
      sendData(res, report);
    } catch (err) {
      sendError(res, err, req);
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/imports/:id/samples
// ─────────────────────────────────────────────────────────────────────────────
importsRouter.get(
  "/:id/samples",
  requirePermission(...ANY_ACTIVE),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const query = SamplesQuerySchema.parse(req.query);
      const { data, total } = await service.listSamples(id, query);
      sendPage(res, data, { page: query.page, pageSize: query.page_size, total });
    } catch (err) {
      sendError(res, err, req);
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/imports/:id/daily-counts
// Returns per-date sample counts (S, W, N) — used by media page
// ─────────────────────────────────────────────────────────────────────────────
importsRouter.get(
  "/:id/daily-counts",
  requirePermission(...ANY_ACTIVE),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const counts = await service.getDailyCounts(id);
      sendData(res, counts);
    } catch (err) {
      sendError(res, err, req);
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/v1/imports/:id  (admin only — marks report as ERROR/cancelled)
// ─────────────────────────────────────────────────────────────────────────────
importsRouter.delete(
  "/:id",
  requirePermission(...ADMIN_ONLY),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) { sendError(res, Err.unauthorized(), req); return; }
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await service.cancelReport(id, req.user.id);
      sendData(res, { id, status: "CANCELLED" });
    } catch (err) {
      sendError(res, err, req);
    }
  }
);
