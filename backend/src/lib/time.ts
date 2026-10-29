/**
 * backend/src/lib/time.ts
 *
 * Pure time utilities — no network, no DB.
 * All functions work on "HH:mm" strings (24-hour format).
 *
 * This module is the shared building block for autoclave end-time calculation
 * (Phase 4). Tested in backend/src/modules/autoclave/__tests__/time.test.ts.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface TimeResult {
  /** "HH:mm" in 24-hour format */
  time: string;
  /** 0 = same day, 1 = next day (midnight crossing) */
  dayOffset: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────

/** Returns true if s is a valid "HH:mm" 24-hour time string. */
export function isValidTime(s: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(s)) return false;
  const [h, m] = s.split(":").map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

/** Throws if the value is not a valid HH:mm time. */
export function assertValidTime(s: string, fieldName = "time"): void {
  if (!isValidTime(s)) {
    throw new Error(`Invalid ${fieldName}: "${s}" is not a valid HH:mm time.`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Core arithmetic
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Add `minutes` to a "HH:mm" start time.
 *
 * Returns { time: "HH:mm", dayOffset: 0 | 1 }.
 * dayOffset is 1 when the result crosses midnight.
 *
 * Examples:
 *   addMinutesToTime("11:10", 15)  → { time: "11:25", dayOffset: 0 }
 *   addMinutesToTime("23:50", 15)  → { time: "00:05", dayOffset: 1 }
 *   addMinutesToTime("00:00", 0)   → { time: "00:00", dayOffset: 0 }
 */
export function addMinutesToTime(startTime: string, minutes: number): TimeResult {
  assertValidTime(startTime, "startTime");
  if (!Number.isInteger(minutes) || minutes < 0) {
    throw new Error(`minutes must be a non-negative integer, got: ${minutes}`);
  }

  const [startH, startM] = startTime.split(":").map(Number);
  const totalMinutes = startH * 60 + startM + minutes;

  const MINUTES_IN_DAY = 24 * 60;
  const dayOffset = totalMinutes >= MINUTES_IN_DAY ? 1 : 0;
  const wrappedMinutes = totalMinutes % MINUTES_IN_DAY;

  const h = Math.floor(wrappedMinutes / 60);
  const m = wrappedMinutes % 60;

  const time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  return { time, dayOffset };
}

// ─────────────────────────────────────────────────────────────────────────────
// Formatting helpers (used by export layer)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert "HH:mm" (24-hour) to "HH:MM AM/PM" (12-hour).
 * The frontend also does this via formatTime12h() in format.ts,
 * but this version is for server-side PDF/Excel exports.
 */
export function to12Hour(time: string): string {
  assertValidTime(time);
  const [h, m] = time.split(":").map(Number);
  const period = h < 12 ? "AM" : "PM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(hour12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
}

/**
 * Format a Date as "DD-MM-YYYY" (lab display format per AGENTS.md §3.6).
 */
export function formatDateDMY(date: Date): string {
  const d = String(date.getUTCDate()).padStart(2, "0");
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const y = date.getUTCFullYear();
  return `${d}-${m}-${y}`;
}

/**
 * Return the first day of the month for a given date, as a Date (UTC midnight).
 */
export function firstOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

/**
 * Return current time in Asia/Kolkata timezone as a Date object.
 */
export function getNowKolkata(): Date {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date());
  const mapping: Record<string, string> = {};
  parts.forEach((p) => {
    mapping[p.type] = p.value;
  });
  const isoStr = `${mapping.year}-${mapping.month}-${mapping.day}T${mapping.hour}:${mapping.minute}:${mapping.second}Z`;
  return new Date(isoStr);
}

/**
 * Format 24h time "HH:mm" to 12h "HH:mm AM/PM".
 */
export function formatTime12h(time: string): string {
  if (!time) return "";
  return to12Hour(time.slice(0, 5));
}

/**
 * Checks if a Date object is a Friday (laboratory non-working holiday).
 */
export function isFriday(date: Date): boolean {
  return date.getUTCDay() === 5 || date.getDay() === 5;
}

/**
 * Adjusts a date forward to Saturday (+1 day) if it lands on Friday.
 */
export function skipFriday(date: Date): Date {
  const adjusted = new Date(date.getTime());
  if (adjusted.getUTCDay() === 5) {
    adjusted.setUTCDate(adjusted.getUTCDate() + 1);
  }
  return adjusted;
}

/**
 * Adds days skipping Friday holidays.
 */
export function addDaysSkippingFriday(date: Date, daysToAdd: number): Date {
  let current = skipFriday(date);
  for (let i = 0; i < daysToAdd; i++) {
    current.setUTCDate(current.getUTCDate() + 1);
    current = skipFriday(current);
  }
  return current;
}
