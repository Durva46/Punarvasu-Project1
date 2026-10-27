/**
 * backend/src/lib/audit.ts
 *
 * recordAudit() — write one row to AuditLog for every state-changing operation.
 * All routes that create, update, delete, or export call this.
 */

import { prisma } from "./prisma";

export interface AuditEntry {
  tableName:   string;
  recordId:    string;
  action:      string;      // CREATE | UPDATE | DELETE | EXPORT_*
  changedById?: string;     // profile id (UUID)
  field?:      string;      // null for CREATE / DELETE
  oldValue?:   string;
  newValue?:   string;
  reason?:     string;
}

/**
 * Write a single audit row. Never throws — logs the error and moves on
 * so that an audit failure never blocks the main operation.
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        tableName:   entry.tableName,
        recordId:    entry.recordId,
        action:      entry.action,
        changedById: entry.changedById ?? null,
        field:       entry.field ?? null,
        oldValue:    entry.oldValue ?? null,
        newValue:    entry.newValue ?? null,
        reason:      entry.reason ?? null,
      },
    });
  } catch (err) {
    // Audit failures must not crash the request
    console.error("[audit] Failed to write audit row:", err);
  }
}

/**
 * Diff two objects and write one AuditLog row per changed field.
 * Only primitive-comparable values (string, number, boolean) are diffed.
 * Arrays and objects are JSON-serialised for comparison.
 */
export async function recordFieldAudit(opts: {
  tableName:   string;
  recordId:    string;
  changedById?: string;
  reason?:     string;
  before:      Record<string, unknown>;
  after:       Record<string, unknown>;
}): Promise<void> {
  const { tableName, recordId, changedById, reason, before, after } = opts;

  for (const key of Object.keys(after)) {
    const oldRaw = before[key];
    const newRaw = after[key];

    const oldStr = oldRaw === undefined ? undefined : JSON.stringify(oldRaw);
    const newStr = newRaw === undefined ? undefined : JSON.stringify(newRaw);

    if (oldStr === newStr) continue;

    await recordAudit({
      tableName,
      recordId,
      action:      "UPDATE",
      changedById,
      field:       key,
      oldValue:    oldStr,
      newValue:    newStr,
      reason,
    });
  }
}
