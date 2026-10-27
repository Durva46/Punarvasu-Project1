/**
 * backend/src/modules/media/__tests__/formulaParser.test.ts
 *
 * Unit tests for Phase 3 Section B formula parser requirements:
 * 1. Vector 1 (S=4, W=0):
 *    - SCDB: (S) * 2 = 8
 *    - Mac Conkey's Broth: (S + 1 + 1 + 1) * 2 = 14
 *    - Peptone Water: S + 1 + 1 = 6
 *    - Urea Broth: S + 1 + 1 = 6
 *    - SCDA: (N * 2) + 1 + 1 = 10
 *    - SDA: (N * 2) + 1 + 1 = 10
 *    - R2A: W * 2 (Skipped in application when W=0)
 *
 * 2. Vector 2 (S=7, W=2, N=5):
 *    - R2A: W * 2 = 4
 *    - SCDA: (5 * 2) + 1 + 1 = 12
 *    - SDA: (5 * 2) + 1 + 1 = 12
 *    - SCDB: 7 * 2 = 14
 *    - Mac Conkey's Broth: (7 + 1 + 1 + 1) * 2 = 20
 *    - Peptone Water: 7 + 1 + 1 = 9
 *
 * 3. S=0 behavior:
 *    - S=0, W=0, N=0 evaluates safely without crashing:
 *      SCDB: 0, Mac Conkey's Broth: (0+1+1+1)*2 = 6, Peptone Water: 2.
 *
 * 4. Safe parser checks:
 *    - Unknown characters/tokens rejected (e.g. process.exit, alert, eval, %, &, ;, $)
 *    - Mismatched parentheses rejected
 *
 * 5. Quantity calculation & precision:
 *    - 8 * 2.70 = 21.60
 */

import { describe, it, expect } from "vitest";
import { evaluateFormula, calculateQuantityUsed } from "../formulaParser";

describe("Safe Formula Expression Parser", () => {
  it("evaluates Vector 1: S=4, W=0, N=4 correctly", () => {
    const vars = { S: 4, W: 0, N: 4 };

    expect(evaluateFormula("(S) * 2", vars)).toBe(8);
    expect(evaluateFormula("(S + 1 + 1 + 1) * 2", vars)).toBe(14);
    expect(evaluateFormula("S + 1 + 1", vars)).toBe(6);
    expect(evaluateFormula("(N * 2) + 1 + 1", vars)).toBe(10);
  });

  it("evaluates Vector 2: S=7, W=2, N=5 correctly", () => {
    const vars = { S: 7, W: 2, N: 5 };

    expect(evaluateFormula("W * 2", vars)).toBe(4);
    expect(evaluateFormula("(N * 2) + 1 + 1", vars)).toBe(12);
    expect(evaluateFormula("(S) * 2", vars)).toBe(14);
    expect(evaluateFormula("(S + 1 + 1 + 1) * 2", vars)).toBe(20);
    expect(evaluateFormula("S + 1 + 1", vars)).toBe(9);
  });

  it("handles S=0, W=0, N=0 without crashing", () => {
    const vars = { S: 0, W: 0, N: 0 };

    expect(evaluateFormula("(S) * 2", vars)).toBe(0);
    expect(evaluateFormula("(S + 1 + 1 + 1) * 2", vars)).toBe(6);
    expect(evaluateFormula("S + 1 + 1", vars)).toBe(2);
    expect(evaluateFormula("W * 2", vars)).toBe(0);
    expect(evaluateFormula("(N * 2) + 1 + 1", vars)).toBe(2);
  });

  it("rejects invalid, unsafe, or malformed expressions", () => {
    const vars = { S: 4, W: 0, N: 4 };

    // Malformed syntax
    expect(() => evaluateFormula("((S + 1)", vars)).toThrow();
    expect(() => evaluateFormula("S + * 2", vars)).toThrow();
    expect(() => evaluateFormula("", vars)).toThrow();

    // Disallowed tokens / injection attempts
    expect(() => evaluateFormula("eval('alert(1)')", vars)).toThrow();
    expect(() => evaluateFormula("process.exit()", vars)).toThrow();
    expect(() => evaluateFormula("S + X", vars)).toThrow();
    expect(() => evaluateFormula("S % 2", vars)).toThrow();
    expect(() => evaluateFormula("S; drop table", vars)).toThrow();
  });

  it("calculates quantity used with 4 decimal storage and 2 decimal display", () => {
    // 8 tubes * 2.70 gm = 21.60
    const result = calculateQuantityUsed(8, 2.7);
    expect(result.storedGm).toBe(21.6);
    expect(result.displayGm).toBe("21.60");

    // null quantity per tube
    const nullResult = calculateQuantityUsed(8, null);
    expect(nullResult.storedGm).toBeNull();
    expect(nullResult.displayGm).toBeNull();

    // fractional quantity precision
    const fractionResult = calculateQuantityUsed(3, 1.3333);
    expect(fractionResult.storedGm).toBe(3.9999);
    expect(fractionResult.displayGm).toBe("4.00");
  });
});
