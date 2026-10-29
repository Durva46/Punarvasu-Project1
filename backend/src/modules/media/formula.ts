/**
 * backend/src/modules/media/formula.ts
 *
 * Formula engine for Media Preparation (Step 1).
 * Strictly enforces rules from AGENTS.md §5:
 *  - S: total samples
 *  - W: water samples
 *  - N: non-water samples (S - W)
 *  - PC: positive control (default 1)
 *  - NC: negative control (default 1)
 *
 * Tube/Plate formulas:
 *  1. SCDB: T = S * 2
 *  2. Mac Conkey's Broth: T = (S + 1 + 1 + 1) * 2
 *  3. Standard: T = S + 1 + 1 (Peptone water, agars, etc.)
 *  4. R2A: T = W * 2 (conditional: only if W > 0)
 *  5. SCDA / SDA: T = (N * 2) + 1 + 1
 */

export interface FormulaInput {
  S: number;  // Total samples
  W: number;  // Water samples
  N: number;  // S - W
  PC?: number; // default 1
  NC?: number; // default 1
}

export interface CalculatedTubes {
  formulaKey: string;
  tubes: number;
  formulaText: string;
}

/**
 * Evaluates the tube/plate count for a given formulaKey and counts.
 */
export function calculateTubePlates(
  formulaKey: string,
  input: FormulaInput
): CalculatedTubes {
  const { S, W, N } = input;

  switch (formulaKey) {
    case "SCDB_BROTH":
      return {
        formulaKey,
        tubes: S * 2,
        formulaText: "(S) * 2",
      };

    case "MACCONKEY_BROTH":
      // Formula: (S + 1 + 1) * 2
      return {
        formulaKey,
        tubes: (S + 1 + 1) * 2,
        formulaText: "(S + 1 + 1) * 2",
      };

    case "STANDARD_PLUS_TWO":
      return {
        formulaKey,
        tubes: S + 1 + 1,
        formulaText: "S + 1 + 1",
      };

    case "R2A":
      return {
        formulaKey,
        tubes: W * 2,
        formulaText: "W * 2",
      };

    case "AGAR_NON_WATER":
      return {
        formulaKey,
        tubes: N * 2 + 1 + 1,
        formulaText: "(N * 2) + 1 + 1",
      };

    default:
      // Fallback to standard + 2 if unknown
      return {
        formulaKey,
        tubes: S + 1 + 1,
        formulaText: "S + 1 + 1",
      };
  }
}
