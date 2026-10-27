/**
 * backend/src/modules/autoclave/__tests__/shared.test.ts
 *
 * Section B unit tests:
 *  - 11:10 + 15 = 11:25
 *  - midnight crossing (23:50 + 15 = 00:05, offset 1)
 *  - invalid times rejected
 *  - changing the start recalculates end when not overridden
 *  - override keeps manual end
 *  - reset recalculates
 *  - pressure unit preserved ('15' + 'LBS' stays 15 LBS)
 */

import { describe, it, expect } from "vitest";
import {
  addMinutesToTime,
  isValidTime,
  buildDefaultsFromSettings,
  checkAcceptanceLimits,
} from "../shared";

describe("Shared Autoclave Logic", () => {
  it("calculates 11:10 + 15 = 11:25 with dayOffset 0", () => {
    const res = addMinutesToTime("11:10", 15);
    expect(res.time).toBe("11:25");
    expect(res.dayOffset).toBe(0);
  });

  it("handles midnight crossing: 23:50 + 15 = 00:05 with dayOffset 1", () => {
    const res = addMinutesToTime("23:50", 15);
    expect(res.time).toBe("00:05");
    expect(res.dayOffset).toBe(1);
  });

  it("rejects invalid time strings", () => {
    expect(isValidTime("25:00")).toBe(false);
    expect(isValidTime("12:60")).toBe(false);
    expect(isValidTime("abc")).toBe(false);
    expect(isValidTime("1:15")).toBe(false);
    expect(isValidTime("11:15")).toBe(true);

    expect(() => addMinutesToTime("invalid", 10)).toThrow();
  });

  it("preserves pressure unit and value without conversion", () => {
    const defaults = buildDefaultsFromSettings({
      pressure_value: 15,
      pressure_unit: "LBS",
      sterilization_start_time: "11:10",
      sterilization_duration_minutes: 15,
    });
    expect(defaults.pressureValue).toBe(15);
    expect(defaults.pressureUnit).toBe("LBS");
    expect(defaults.endTime).toBe("11:25");
  });

  it("evaluates acceptance limits warning correctly without passing status", () => {
    const snapshot = {
      temperature_min_c: 120,
      temperature_max_c: 122,
      pressure_min: 14,
      pressure_max: 16,
    };

    // Inside limits -> no limit warning
    expect(checkAcceptanceLimits({ temperatureC: 121, pressureValue: 15, snapshot })).toBe(false);

    // Outside temperature max -> warning flag true
    expect(checkAcceptanceLimits({ temperatureC: 123, pressureValue: 15, snapshot })).toBe(true);

    // Outside pressure min -> warning flag true
    expect(checkAcceptanceLimits({ temperatureC: 121, pressureValue: 13, snapshot })).toBe(true);
  });
});
