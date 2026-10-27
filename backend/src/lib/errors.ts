/**
 * backend/src/lib/errors.ts
 *
 * Centralised error classes and HTTP response helpers.
 * Every route uses `sendError()` so error shapes are consistent:
 *   { error: { code, message, details?, requestId? } }
 */

import { Request, Response } from "express";
import { ZodError } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// Error codes
// ─────────────────────────────────────────────────────────────────────────────
export const ErrorCode = {
  // 400
  VALIDATION_ERROR:     "VALIDATION_ERROR",
  INVALID_INPUT:        "INVALID_INPUT",
  // 401
  UNAUTHORIZED:         "UNAUTHORIZED",
  INVALID_TOKEN:        "INVALID_TOKEN",
  // 403
  FORBIDDEN:            "FORBIDDEN",
  INSUFFICIENT_ROLE:    "INSUFFICIENT_ROLE",
  // 404
  NOT_FOUND:            "NOT_FOUND",
  // 409
  CONFLICT:             "CONFLICT",
  DUPLICATE_ENTRY:      "DUPLICATE_ENTRY",
  // 422
  BUSINESS_RULE:        "BUSINESS_RULE",
  VERIFIED_IMMUTABLE:   "VERIFIED_IMMUTABLE",
  MONTH_CHANGE_BLOCKED: "MONTH_CHANGE_BLOCKED",
  UNKNOWN_DONE_BY:      "UNKNOWN_DONE_BY",
  // 500
  INTERNAL_ERROR:       "INTERNAL_ERROR",
} as const;

export type ErrorCodeType = typeof ErrorCode[keyof typeof ErrorCode];

// ─────────────────────────────────────────────────────────────────────────────
// AppError — throw this anywhere in business logic
// ─────────────────────────────────────────────────────────────────────────────
export class AppError extends Error {
  constructor(
    public readonly code: ErrorCodeType,
    message: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience constructors
// ─────────────────────────────────────────────────────────────────────────────
export const Err = {
  validation: (message: string, details?: unknown) =>
    new AppError(ErrorCode.VALIDATION_ERROR, message, 400, details),

  unauthorized: (message = "Authentication required") =>
    new AppError(ErrorCode.UNAUTHORIZED, message, 401),

  invalidToken: (message = "Invalid or expired token") =>
    new AppError(ErrorCode.INVALID_TOKEN, message, 401),

  forbidden: (message = "You do not have permission to perform this action") =>
    new AppError(ErrorCode.FORBIDDEN, message, 403),

  insufficientRole: (required: string | string[]) =>
    new AppError(
      ErrorCode.INSUFFICIENT_ROLE,
      `This action requires role: ${Array.isArray(required) ? required.join(" or ") : required}`,
      403,
    ),

  notFound: (resource: string) =>
    new AppError(ErrorCode.NOT_FOUND, `${resource} not found`, 404),

  conflict: (message: string) =>
    new AppError(ErrorCode.CONFLICT, message, 409),

  duplicate: (resource: string) =>
    new AppError(ErrorCode.DUPLICATE_ENTRY, `A ${resource} with these values already exists`, 409),

  businessRule: (message: string, details?: unknown) =>
    new AppError(ErrorCode.BUSINESS_RULE, message, 422, details),

  verifiedImmutable: () =>
    new AppError(
      ErrorCode.VERIFIED_IMMUTABLE,
      "VERIFIED entries cannot be edited. An admin must reopen the entry first.",
      422,
    ),

  monthChangeBlocked: () =>
    new AppError(
      ErrorCode.MONTH_CHANGE_BLOCKED,
      "Moving this entry to a different month requires confirm_month_change=true and a reason.",
      422,
    ),

  unknownDoneBy: () =>
    new AppError(
      ErrorCode.UNKNOWN_DONE_BY,
      "done_by must be an existing active profile ID. Free-text names are not accepted.",
      422,
    ),

  internal: (message = "An unexpected error occurred") =>
    new AppError(ErrorCode.INTERNAL_ERROR, message, 500),
};

// ─────────────────────────────────────────────────────────────────────────────
// HTTP response helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Send a successful { data } response. */
export function sendData<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ data });
}

/** Send a successful { data, meta } paginated response. */
export function sendPage<T>(
  res: Response,
  data: T[],
  meta: { page: number; pageSize: number; total: number },
): void {
  res.status(200).json({ data, meta });
}

/** Send an error response from an AppError, ZodError, or unknown error. */
export function sendError(res: Response, err: unknown, req?: Request): void {
  const requestId = req?.headers["x-request-id"] as string | undefined;

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code:      err.code,
        message:   err.message,
        details:   err.details,
        requestId,
      },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code:      ErrorCode.VALIDATION_ERROR,
        message:   "Input validation failed",
        details:   err.flatten(),
        requestId,
      },
    });
    return;
  }

  // Unknown error — log it, return generic message
  console.error("[sendError] Unhandled error:", err);
  res.status(500).json({
    error: {
      code:      ErrorCode.INTERNAL_ERROR,
      message:   "An unexpected error occurred",
      requestId,
    },
  });
}
