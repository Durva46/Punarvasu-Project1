/**
 * frontend/src/lib/cleaningShared.ts
 *
 * Client-side mirror of pure cleaning logic for settings live preview & validation.
 */

export interface CleaningScheduleRule {
  year: number;
  month: number; // 1-12
  firstDay: number;
  secondDay: number;
  intervalDays: number;
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function generateCleaningDayNumbers(rule: CleaningScheduleRule): number[] {
  const { year, month, firstDay, secondDay, intervalDays } = rule;

  if (month < 1 || month > 12) return [];
  if (firstDay < 1 || secondDay <= firstDay || intervalDays < 1) return [];

  const daysInMonth = getDaysInMonth(year, month);
  const result: number[] = [];

  if (firstDay <= daysInMonth) result.push(firstDay);
  if (secondDay <= daysInMonth) result.push(secondDay);

  let nextDay = secondDay + intervalDays;
  while (nextDay <= daysInMonth) {
    result.push(nextDay);
    nextDay += intervalDays;
  }

  return Array.from(new Set(result)).sort((a, b) => a - b);
}

export function generateCleaningDates(rule: CleaningScheduleRule): string[] {
  const dayNumbers = generateCleaningDayNumbers(rule);
  const mm = String(rule.month).padStart(2, "0");

  return dayNumbers.map((d) => {
    const dd = String(d).padStart(2, "0");
    return `${rule.year}-${mm}-${dd}`;
  });
}

/**
 * Returns current date in Asia/Kolkata as a Date and string (YYYY-MM-DD).
 */
export function getTodayInKolkata(): { dateStr: string; date: Date } {
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
 * Computes status display matching database view logic.
 */
export function computeCleaningStatusDisplay(
  scheduledDateStr: string,
  status: "SCHEDULED" | "COMPLETED",
  todayIstStr: string
): "SCHEDULED" | "COMPLETED" | "OVERDUE" {
  if (status === "COMPLETED") {
    return "COMPLETED";
  }
  if (scheduledDateStr < todayIstStr) {
    return "OVERDUE";
  }
  return "SCHEDULED";
}
