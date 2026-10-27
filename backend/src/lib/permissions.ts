/**
 * backend/src/lib/permissions.ts
 *
 * Role-based access control middleware for Express routes.
 *
 * Auth model (Phase 4 decision): Supabase bearer token (JWT) verified here.
 * The profile row is fetched from the `profiles` table (not from Supabase Auth
 * metadata) so role/active is always from the application's own table.
 *
 * Usage in routes:
 *   router.get("/foo", requirePermission("analyst", "admin"), handler);
 *   router.post("/bar", requirePermission("admin"), handler);
 */

import { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "./prisma";
import { sendError, Err } from "./errors";
import { env } from "../config/env";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type Role = "admin" | "analyst" | "verifier" | "viewer";

// Augment Express Request so downstream handlers get the authenticated user
declare global {
  namespace Express {
    interface Request {
      /** The authenticated user's profile row */
      user?: {
        id:       string;
        fullName: string;
        role:     Role;
        active:   boolean;
      };
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Supabase admin client (used only to verify JWTs — never exposed to frontend)
// ─────────────────────────────────────────────────────────────────────────────
const supabaseAdmin = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ─────────────────────────────────────────────────────────────────────────────
// Token extraction helper
// ─────────────────────────────────────────────────────────────────────────────
function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7).trim() || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Core middleware factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Express middleware that:
 *  1. Extracts the Bearer JWT from the Authorization header.
 *  2. Verifies it with Supabase.
 *  3. Loads the matching profile row.
 *  4. Checks the profile is active.
 *  5. Checks the profile role is in `allowedRoles`.
 *  6. Attaches `req.user` for downstream handlers.
 *
 * @param allowedRoles — one or more roles allowed to access this route.
 *   Empty array means "any authenticated active user".
 */
export function requirePermission(...allowedRoles: Role[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 1. Extract token
      const token = extractBearerToken(req);
      if (!token) {
        sendError(res, Err.unauthorized(), req);
        return;
      }

      // 2. Verify JWT with Supabase
      const { data: { user: supabaseUser }, error: authError } =
        await supabaseAdmin.auth.getUser(token);

      if (authError || !supabaseUser) {
        sendError(res, Err.invalidToken(), req);
        return;
      }

      // 3. Load profile from our own table
      const profile = await prisma.profile.findUnique({
        where: { id: supabaseUser.id },
      });

      if (!profile) {
        sendError(res, Err.forbidden("No profile found. Contact an administrator."), req);
        return;
      }

      // 4. Check profile is active
      if (!profile.active) {
        sendError(res, Err.forbidden("Your account has been deactivated."), req);
        return;
      }

      // 5. Check role (empty allowedRoles = any active user)
      if (
        allowedRoles.length > 0 &&
        !allowedRoles.includes(profile.role as Role)
      ) {
        sendError(res, Err.insufficientRole(allowedRoles), req);
        return;
      }

      // 6. Attach to request
      req.user = {
        id:       profile.id,
        fullName: profile.fullName,
        role:     profile.role as Role,
        active:   profile.active,
      };

      next();
    } catch (err) {
      sendError(res, err, req);
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience role sets (reduces typos in route files)
// ─────────────────────────────────────────────────────────────────────────────
export const ADMIN_ONLY:      Role[] = ["admin"];
export const ADMIN_ANALYST:   Role[] = ["admin", "analyst"];
export const VERIFIER_ADMIN:  Role[] = ["admin", "verifier"];
export const ANY_ACTIVE:      Role[] = [];   // empty = any authenticated active user
