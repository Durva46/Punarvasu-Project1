/**
 * backend/src/modules/autoclave/cleaningShared.ts
 *
 * Pure TypeScript, no network, no DB.
 * Generates sorted cleaning dates for a given month and rule:
 *  - start with firstDay, then secondDay, then keep adding intervalDays
 *  - stops when passing last day of the month
 *  - drops any date not existing in that month
 *  - never produces duplicates, never produces dates outside the month
 *  - first interval is NOT forced to equal intervalDays (e.g. Day 1 to Day 7 = 6-day gap)
 */

export interface CleaningScheduleRule {
  year: number;
  month: number; // 1-12
  firstDay: number;
  secondDay: number;
  intervalDays: number;
}

/**
 * Returns number of days in a given year and month (1-indexed).
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Generates the list of scheduled cleaning day numbers (1..31) for the month.
 */
export function generateCleaningDayNumbers(rule: CleaningScheduleRule): number[] {
  const { year, month, firstDay, secondDay, intervalDays } = rule;

  if (month < 1 || month > 12) {
    throw new Error(`Invalid month ${month}. Must be between 1 and 12.`);
  }
  if (firstDay < 1) {
    throw new Error(`firstDay (${firstDay}) must be >= 1.`);
  }
  if (secondDay <= firstDay) {
    throw new Error(`secondDay (${secondDay}) must be strictly greater than firstDay (${firstDay}).`);
  }
  if (intervalDays < 1) {
    throw new Error(`intervalDays (${intervalDays}) must be >= 1.`);
  }

  const daysInMonth = getDaysInMonth(year, month);
  const result: number[] = [];

  if (firstDay <= daysInMonth) {
    result.push(firstDay);
  }
  if (secondDay <= daysInMonth) {
    result.push(secondDay);
  }

  let nextDay = secondDay + intervalDays;
  while (nextDay <= daysInMonth) {
    result.push(nextDay);
    nextDay += intervalDays;
  }

  return Array.from(new Set(result)).sort((a, b) => a - b);
}

/**
 * Generates YYYY-MM-DD formatted date strings.
 */
export function generateCleaningDates(rule: CleaningScheduleRule): string[] {
  const dayNumbers = generateCleaningDayNumbers(rule);
  const mm = String(rule.month).padStart(2, "0");

  return dayNumbers.map((d) => {
    const dd = String(d).padStart(2, "0");
    return `${rule.year}-${mm}-${dd}`;
  });
}

/**
 * Returns the current date in Asia/Kolkata as a Date (UTC midnight representation of the IST day).
 */
export function getTodayInKolkata(): { dateStr: string; date: Date } {
  // Format current time into Asia/Kolkata date string YYYY-MM-DD
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const dateStr = formatter.format(new Date()); // "YYYY-MM-DD"
  const date = new Date(dateStr + "T00:00:00Z");
  return { dateStr, date };
}

/**
 * Computes status_display in pure code matching the view logic.
 */
export function computeCleaningStatusDisplay(
  scheduledDateStr: string,
  status: "SCHEDULED" | "COMPLETED",
  todayIstStr?: string
): "SCHEDULED" | "COMPLETED" | "OVERDUE" {
  if (status === "COMPLETED") return "COMPLETED";

  const todayStr = todayIstStr || getTodayInKolkata().dateStr;
  if (scheduledDateStr < todayStr) {
    return "OVERDUE";
  }
  return "SCHEDULED";
}
