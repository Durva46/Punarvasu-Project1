/**
 * backend/src/modules/__tests__/rolePermissions.test.ts
 *
 * Automated role permissions and access control test suite (Phase 8):
 * Pure testing of permission check logic across ADMIN, ANALYST, VERIFIER, VIEWER, and unauthenticated states.
 */

import { describe, it, expect } from "vitest";
import {
  ADMIN_ANALYST,
  VERIFIER_ADMIN,
  ADMIN_ONLY,
  ANY_ACTIVE,
} from "../../lib/permissions";

describe("Role Permissions & Access Control Matrix (Phase 8)", () => {
  // Helper evaluating permissions identically to requirePermission middleware
  function checkAccess(userRole: string | null, allowedRoles: string[]): boolean {
    if (!userRole) return false;
    // In requirePermission, empty array (ANY_ACTIVE) means any authenticated active user
    if (allowedRoles.length === 0) return true;
    return allowedRoles.includes(userRole);
  }

  // 1. Unauthenticated requests
  it("rejects unauthenticated requests (null user) across all protected rules", () => {
    expect(checkAccess(null, ANY_ACTIVE)).toBe(false);
    expect(checkAccess(null, ADMIN_ANALYST)).toBe(false);
    expect(checkAccess(null, VERIFIER_ADMIN)).toBe(false);
    expect(checkAccess(null, ADMIN_ONLY)).toBe(false);
  });

  // 2. Viewer role
  it("allows VIEWER for read-only (ANY_ACTIVE) but rejects on modification routes", () => {
    expect(checkAccess("viewer", ANY_ACTIVE)).toBe(true);
    expect(checkAccess("viewer", ADMIN_ANALYST)).toBe(false);
    expect(checkAccess("viewer", VERIFIER_ADMIN)).toBe(false);
    expect(checkAccess("viewer", ADMIN_ONLY)).toBe(false);
  });

  // 3. Analyst role
  it("allows ANALYST to generate entries and process media, but forbids cycle verification", () => {
    expect(checkAccess("analyst", ANY_ACTIVE)).toBe(true);
    expect(checkAccess("analyst", ADMIN_ANALYST)).toBe(true);
    expect(checkAccess("analyst", VERIFIER_ADMIN)).toBe(false);
    expect(checkAccess("analyst", ADMIN_ONLY)).toBe(false);
  });

  // 4. Verifier role
  it("allows VERIFIER to verify cycles and reopen cleaning, but forbids raw entry editing", () => {
    expect(checkAccess("verifier", ANY_ACTIVE)).toBe(true);
    expect(checkAccess("verifier", VERIFIER_ADMIN)).toBe(true);
    expect(checkAccess("verifier", ADMIN_ANALYST)).toBe(false);
    expect(checkAccess("verifier", ADMIN_ONLY)).toBe(false);
  });

  // 5. Admin role
  it("allows ADMIN full administrative privileges across all operations", () => {
    expect(checkAccess("admin", ANY_ACTIVE)).toBe(true);
    expect(checkAccess("admin", ADMIN_ANALYST)).toBe(true);
    expect(checkAccess("admin", VERIFIER_ADMIN)).toBe(true);
    expect(checkAccess("admin", ADMIN_ONLY)).toBe(true);
  });
});
