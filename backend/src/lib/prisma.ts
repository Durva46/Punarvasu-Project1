/**
 * backend/src/lib/prisma.ts
 *
 * Prisma client singleton.
 * Import this everywhere — never instantiate PrismaClient directly.
 */

import { PrismaClient } from "@prisma/client";
import { env } from "../config/env";

declare global {
  // Prevent multiple instances in development hot-reload
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log:
      env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["warn", "error"],
  });
}

export const prisma: PrismaClient =
  global.__prisma ?? (global.__prisma = createPrismaClient());

if (env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}
