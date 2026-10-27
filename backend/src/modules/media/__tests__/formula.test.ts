/**
 * backend/src/modules/media/__tests__/formula.test.ts
 *
 * Test vectors required by AGENTS.md §5.3:
 *  - S=4, W=0 -> SCDB 8; Mac Conkey's Broth 14; Peptone Water 6; SCDA 10; SDA 10.
 *  - S=7, W=2 -> R2A 4; SCDA 12; SDA 12.
 *  - S=1, W=1 -> SCDB 2; Mac Conkey's Broth 8; R2A 2; SCDA 2; SDA 2.
 */

import { describe, it, expect } from "vitest";
import { calculateTubePlates } from "../formula";

describe("Media Preparation Formula Engine", () => {
  it("Vector 1: S=4, W=0 (N=4)", () => {
    const input = { S: 4, W: 0, N: 4 };

    expect(calculateTubePlates("SCDB_BROTH", input).tubes).toBe(8);
    expect(calculateTubePlates("MACCONKEY_BROTH", input).tubes).toBe(14); // (4+1+1+1)*2 = 14
    expect(calculateTubePlates("STANDARD_PLUS_TWO", input).tubes).toBe(6); // 4+1+1 = 6
    expect(calculateTubePlates("AGAR_NON_WATER", input).tubes).toBe(10); // (4*2)+1+1 = 10
  });

  it("Vector 2: S=7, W=2 (N=5)", () => {
    const input = { S: 7, W: 2, N: 5 };

    expect(calculateTubePlates("R2A", input).tubes).toBe(4); // 2*2 = 4
    expect(calculateTubePlates("AGAR_NON_WATER", input).tubes).toBe(12); // (5*2)+1+1 = 12
  });

  it("Vector 3: S=1, W=1 (N=0)", () => {
    const input = { S: 1, W: 1, N: 0 };

    expect(calculateTubePlates("SCDB_BROTH", input).tubes).toBe(2); // 1*2 = 2
    expect(calculateTubePlates("MACCONKEY_BROTH", input).tubes).toBe(8); // (1+1+1+1)*2 = 8
    expect(calculateTubePlates("R2A", input).tubes).toBe(2); // 1*2 = 2
    expect(calculateTubePlates("AGAR_NON_WATER", input).tubes).toBe(2); // (0*2)+1+1 = 2
  });
});
