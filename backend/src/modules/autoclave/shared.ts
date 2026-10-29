/**
 * backend/src/modules/autoclave/shared.ts
 *
 * Pure TypeScript functions, no network, no DB.
 * Section B requirements:
 * 1. addMinutesToTime(startTime, minutes) returns { time, dayOffset }
 * 2. buildDefaultsFromSettings(settingsSnapshot)
 * 3. validators: time (HH:mm 24h), temperature numeric (0-200), pressure numeric > 0, date valid, unit non-empty.
 *    Acceptance limits (min/max) read from settings ONLY produce limit_warning = true.
 */

import { addMinutesToTime, isValidTime, assertValidTime } from "../../lib/time";

export { addMinutesToTime, isValidTime, assertValidTime };

export interface AutoclaveSettingsSnapshot {
  autoclave_start_time?: string;
  sterilization_start_time?: string;
  temperature_c?: number;
  pressure_value?: number;
  pressure_unit?: string;
  sterilization_duration_minutes?: number;
  temperature_min_c?: number | null;
  temperature_max_c?: number | null;
  pressure_min?: number | null;
  pressure_max?: number | null;
  allow_select_other_staff?: boolean;
  cleaning_first_day?: number;
  cleaning_second_day?: number;
  cleaning_interval_days?: number;
}

export interface AutoclavePlannedDefaults {
  autoclaveStartTime: string;
  sterilizationStartTime: string;
  temperatureC: number;
  pressureValue: number;
  pressureUnit: string;
  durationMinutes: number;
  endTime: string;
  endDateOffset: number;
}

/**
 * Builds the planned default values for an autoclave entry from the snapshot of settings.
 * Pressure is stored as value + unit separately; never convert units.
 */
export function buildDefaultsFromSettings(
  snapshot: AutoclaveSettingsSnapshot
): AutoclavePlannedDefaults {
  const autoclaveStartTime = snapshot.autoclave_start_time ?? "11:00";
  const sterilizationStartTime = snapshot.sterilization_start_time ?? "12:00"; // 1 hr after autoclave start time
  const temperatureC = snapshot.temperature_c ?? 121;
  const pressureValue = snapshot.pressure_value ?? 15;
  const pressureUnit = snapshot.pressure_unit ?? "LBS";
  const durationMinutes = snapshot.sterilization_duration_minutes ?? 15;

  assertValidTime(autoclaveStartTime, "autoclave_start_time");
  assertValidTime(sterilizationStartTime, "sterilization_start_time");

  const { time: endTime, dayOffset: endDateOffset } = addMinutesToTime(
    sterilizationStartTime,
    durationMinutes
  );

  return {
    autoclaveStartTime,
    sterilizationStartTime,
    temperatureC,
    pressureValue,
    pressureUnit,
    durationMinutes,
    endTime,
    endDateOffset,
  };
}

export interface ValidationLimitsCheck {
  temperatureC?: number;
  pressureValue?: number;
  snapshot: AutoclaveSettingsSnapshot;
}

/**
 * Checks if values are outside configured acceptance limits.
 * ONLY produces limit_warning = true when limits are configured and violated.
 * NEVER produces a "success" or "passed" status.
 */
export function checkAcceptanceLimits(check: ValidationLimitsCheck): boolean {
  const { temperatureC, pressureValue, snapshot } = check;

  if (temperatureC !== undefined) {
    if (
      snapshot.temperature_min_c !== null &&
      snapshot.temperature_min_c !== undefined &&
      temperatureC < snapshot.temperature_min_c
    ) {
      return true;
    }
    if (
      snapshot.temperature_max_c !== null &&
      snapshot.temperature_max_c !== undefined &&
      temperatureC > snapshot.temperature_max_c
    ) {
      return true;
    }
  }

  if (pressureValue !== undefined) {
    if (
      snapshot.pressure_min !== null &&
      snapshot.pressure_min !== undefined &&
      pressureValue < snapshot.pressure_min
    ) {
      return true;
    }
    if (
      snapshot.pressure_max !== null &&
      snapshot.pressure_max !== undefined &&
      pressureValue > snapshot.pressure_max
    ) {
      return true;
    }
  }

  return false;
}
