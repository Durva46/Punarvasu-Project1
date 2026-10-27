/**
 * backend/src/index.ts
 *
 * HTTP server entry point.
 * Import env first — it exits immediately if required variables are missing.
 */

import "./config/env";          // fail-fast env validation
import { env } from "./config/env";
import { createApp } from "./app";

const app = createApp();

const server = app.listen(env.PORT, env.API_HOST, () => {
  console.log(`[server] LabFlow API listening on http://${env.API_HOST}:${env.PORT}`);
  console.log(`[server] NODE_ENV=${env.NODE_ENV}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("[server] SIGTERM received — shutting down gracefully");
  server.close(() => {
    console.log("[server] Closed.");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  server.close(() => process.exit(0));
});
