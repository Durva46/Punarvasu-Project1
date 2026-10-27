/**
 * backend/src/modules/autoclave/__tests__/cleaningShared.test.ts
 *
 * Section B unit tests for cleaning schedule calculation:
 *  - September 2026 (30 days): 1, 7, 14, 21, 28
 *  - October 2026 (31 days): 1, 7, 14, 21, 28
 *  - February 2026 (28 days): 1, 7, 14, 21, 28
 *  - February 2028 (29 days, leap year): 1, 7, 14, 21, 28
 *  - Changed rule (first 3, second 10, interval 7):
 *      31-day month -> 3, 10, 17, 24, 31
 *      30-day month -> 3, 10, 17, 24
 *  - Invalid inputs (second <= first, interval < 1) rejected with clear error
 *  - First interval gap preserved as 6 days (1 to 7) without forcing to intervalDays
 */

import { describe, it, expect } from "vitest";
import {
  generateCleaningDayNumbers,
  generateCleaningDates,
  computeCleaningStatusDisplay,
} from "../cleaningShared";

describe("Weekly Cleaning Schedule Date Generator", () => {
  const standardRule = { firstDay: 1, secondDay: 7, intervalDays: 7 };

  it("September 2026 (30 days) produces [1, 7, 14, 21, 28]", () => {
    const days = generateCleaningDayNumbers({ year: 2026, month: 9, ...standardRule });
    expect(days).toEqual([1, 7, 14, 21, 28]);
  });

  it("October 2026 (31 days) produces [1, 7, 14, 21, 28]", () => {
    const days = generateCleaningDayNumbers({ year: 2026, month: 10, ...standardRule });
    expect(days).toEqual([1, 7, 14, 21, 28]);
  });

  it("February 2026 (28 days) produces [1, 7, 14, 21, 28]", () => {
    const days = generateCleaningDayNumbers({ year: 2026, month: 2, ...standardRule });
    expect(days).toEqual([1, 7, 14, 21, 28]);
  });

  it("February 2028 (29 days, leap year) produces [1, 7, 14, 21, 28]", () => {
    const days = generateCleaningDayNumbers({ year: 2028, month: 2, ...standardRule });
    expect(days).toEqual([1, 7, 14, 21, 28]);
  });

  it("Custom rule (first 3, second 10, interval 7) on 31-day vs 30-day month", () => {
    const customRule = { firstDay: 3, secondDay: 10, intervalDays: 7 };

    // October 2026 (31 days): 3, 10, 17, 24, 31
    const oct = generateCleaningDayNumbers({ year: 2026, month: 10, ...customRule });
    expect(oct).toEqual([3, 10, 17, 24, 31]);

    // September 2026 (30 days): 3, 10, 17, 24 (31 dropped because > 30)
    const sep = generateCleaningDayNumbers({ year: 2026, month: 9, ...customRule });
    expect(sep).toEqual([3, 10, 17, 24]);
  });

  it("Rejects invalid parameters with clear error messages", () => {
    // secondDay <= firstDay
    expect(() =>
      generateCleaningDayNumbers({ year: 2026, month: 9, firstDay: 7, secondDay: 7, intervalDays: 7 })
    ).toThrow("must be strictly greater than firstDay");

    expect(() =>
      generateCleaningDayNumbers({ year: 2026, month: 9, firstDay: 8, secondDay: 7, intervalDays: 7 })
    ).toThrow("must be strictly greater than firstDay");

    // intervalDays < 1
    expect(() =>
      generateCleaningDayNumbers({ year: 2026, month: 9, firstDay: 1, secondDay: 7, intervalDays: 0 })
    ).toThrow("intervalDays (0) must be >= 1");
  });

  it("Preserves the 6-day first interval gap without forcing it to intervalDays", () => {
    const dates = generateCleaningDates({ year: 2026, month: 9, firstDay: 1, secondDay: 7, intervalDays: 7 });
    expect(dates).toEqual([
      "2026-09-01",
      "2026-09-07",
      "2026-09-14",
      "2026-09-21",
      "2026-09-28",
    ]);

    // Gap between date 0 and date 1 is exactly 6 days
    const d1 = new Date("2026-09-01T00:00:00Z").getTime();
    const d2 = new Date("2026-09-07T00:00:00Z").getTime();
    expect((d2 - d1) / (1000 * 60 * 60 * 24)).toBe(6);
  });

  it("Computes status display properly relative to given IST today", () => {
    const todayIst = "2026-09-10";

    // Past scheduled date -> OVERDUE
    expect(computeCleaningStatusDisplay("2026-09-07", "SCHEDULED", todayIst)).toBe("OVERDUE");

    // Today scheduled date -> SCHEDULED
    expect(computeCleaningStatusDisplay("2026-09-10", "SCHEDULED", todayIst)).toBe("SCHEDULED");

    // Future scheduled date -> SCHEDULED
    expect(computeCleaningStatusDisplay("2026-09-14", "SCHEDULED", todayIst)).toBe("SCHEDULED");

    // COMPLETED row is always COMPLETED even if in past
    expect(computeCleaningStatusDisplay("2026-09-01", "COMPLETED", todayIst)).toBe("COMPLETED");
  });
});
