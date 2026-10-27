/**
 * backend/src/modules/staff/routes.ts
 *
 * Staff routes:
 * GET /api/v1/staff - List active staff profiles (id, full_name, role) for Done By / selector
 * No sensitive information (emails, passwords) returned.
 */

import { Router, Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { requirePermission, ANY_ACTIVE } from "../../lib/permissions";
import { sendData, sendError } from "../../lib/errors";

export const staffRouter = Router();

staffRouter.get(
  "/",
  requirePermission(...ANY_ACTIVE),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const profiles = await prisma.profile.findMany({
        where: { active: true },
        select: {
          id: true,
          fullName: true,
          role: true,
        },
        orderBy: { fullName: "asc" },
      });

      sendData(
        res,
        profiles.map((p) => ({
          id: p.id,
          full_name: p.fullName,
          role: p.role,
        }))
      );
    } catch (err) {
      sendError(res, err, req);
    }
  }
);
