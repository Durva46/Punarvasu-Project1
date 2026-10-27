/**
 * frontend/src/__tests__/formatTime.test.ts
 *
 * Frontend unit tests for formatTime12h & previewEndTime.
 */

import { describe, it, expect } from "vitest";
import { formatTime12h, previewEndTime } from "../lib/format";

describe("Frontend Time Helpers", () => {
  it("formats 24-hour time to 12-hour AM/PM correctly", () => {
    expect(formatTime12h("11:10")).toBe("11:10 AM");
    expect(formatTime12h("13:45")).toBe("01:45 PM");
    expect(formatTime12h("00:00")).toBe("12:00 AM");
    expect(formatTime12h("12:00")).toBe("12:00 PM");
    expect(formatTime12h("23:59")).toBe("11:59 PM");
  });

  it("handles midnight crossing day offset display (+1 day)", () => {
    expect(formatTime12h("00:05", 1)).toBe("12:05 AM (+1 day)");
    expect(formatTime12h("01:30", 1)).toBe("01:30 AM (+1 day)");
  });

  it("calculates live preview end time with duration", () => {
    // 11:10 + 15 min = 11:25 AM
    const res1 = previewEndTime("11:10", 15);
    expect(res1.time).toBe("11:25");
    expect(res1.dayOffset).toBe(0);
    expect(res1.formatted).toBe("11:25 AM");

    // 23:50 + 15 min = 12:05 AM (+1 day)
    const res2 = previewEndTime("23:50", 15);
    expect(res2.time).toBe("00:05");
    expect(res2.dayOffset).toBe(1);
    expect(res2.formatted).toBe("12:05 AM (+1 day)");
  });
});
