/**
 * backend/src/app.ts
 *
 * Express application factory.
 * Mounts all API routes for Phase 3 and Phase 4:
 *  - /api/v1/imports
 *  - /api/v1/media
 *  - /api/v1/alerts
 *  - /api/v1/settings
 *  - /api/v1/autoclave
 *  - /api/v1/staff
 */

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { env } from "./config/env";
import { sendError } from "./lib/errors";

import { importsRouter } from "./modules/imports/routes";
import { mediaRouter } from "./modules/media/routes";
import { alertsRouter } from "./modules/alerts/routes";
import { settingsRouter } from "./modules/settings/routes";
import { autoclaveRouter } from "./modules/autoclave/routes";
import { staffRouter } from "./modules/staff/routes";
import { exportsRouter } from "./modules/exports/routes";

export function createApp(): express.Application {
  const app = express();

  // ── Trust proxy (required for Vercel) ──────────────────────────────────
  if (env.TRUST_PROXY) app.set("trust proxy", env.TRUST_PROXY);

  // ── CORS ───────────────────────────────────────────────────────────────
  app.use(
    cors({
      origin: env.CORS_ORIGINS,
      credentials: true,
      methods: ["GET", "POST", "PATCH", "DELETE", "PUT", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
    })
  );

  // ── Body parsing ───────────────────────────────────────────────────────
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));

  // ── Request ID ─────────────────────────────────────────────────────────
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (!req.headers["x-request-id"]) {
      req.headers["x-request-id"] = `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    }
    next();
  });

  // ── Health check ───────────────────────────────────────────────────────
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", ts: new Date().toISOString() });
  });

  // ── Feature routers (/api/v1) ──────────────────────────────────────────
  app.use("/api/v1/imports", importsRouter);
  app.use("/api/v1/media", mediaRouter);
  app.use("/api/v1/alerts", alertsRouter);
  app.use("/api/v1/settings", settingsRouter);
  app.use("/api/v1/autoclave", autoclaveRouter);
  app.use("/api/v1/staff", staffRouter);
  app.use("/api/v1", exportsRouter);

  // Backward compatibility / direct aliases (/api/...)
  app.use("/api/imports", importsRouter);
  app.use("/api/media", mediaRouter);
  app.use("/api/alerts", alertsRouter);
  app.use("/api/settings", settingsRouter);
  app.use("/api/autoclave", autoclaveRouter);
  app.use("/api/staff", staffRouter);
  app.use("/api", exportsRouter);

  // ── 404 handler ────────────────────────────────────────────────────────
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } });
  });

  // ── Global error handler ───────────────────────────────────────────────
  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    sendError(res, err, req);
  });

  return app;
}
