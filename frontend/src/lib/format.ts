/**
 * frontend/src/lib/format.ts
 *
 * Date, Time, and Number formatting helpers.
 * Date format: DD-MM-YYYY
 * Time format: 12-hour (e.g. 11:10 AM, 12:05 AM (+1 day))
 */

export function formatDate(isoStr?: string | null): string {
  if (!isoStr) return "-";
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

export function formatGrams(val?: number | null): string {
  if (val === null || val === undefined) return "-";
  return Number(val).toFixed(2);
}

export function formatNumber(val?: number | null): string {
  if (val === null || val === undefined) return "-";
  return String(val);
}

/**
 * Formats "HH:mm" (24h) into 12-hour format with optional midnight crossing offset.
 * Example:
 *  - "11:10", offset 0 -> "11:10 AM"
 *  - "23:50", offset 0 -> "11:50 PM"
 *  - "00:05", offset 1 -> "12:05 AM (+1 day)"
 */
export function formatTime12h(timeStr?: string | null, dayOffset = 0): string {
  if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) return timeStr || "-";
  const [hStr, mStr] = timeStr.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);

  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const formattedHour = String(hour12).padStart(2, "0");
  const formattedMin = String(m).padStart(2, "0");

  const base = `${formattedHour}:${formattedMin} ${period}`;
  return dayOffset > 0 ? `${base} (+${dayOffset} day)` : base;
}

/**
 * Client-side calculation for live preview only.
 * Always labelled "preview, saved value is calculated by the server".
 */
export function previewEndTime(
  startTimeStr: string,
  durationMinutes = 15
): { time: string; dayOffset: number; formatted: string } {
  if (!startTimeStr || !/^\d{2}:\d{2}$/.test(startTimeStr)) {
    return { time: "", dayOffset: 0, formatted: "-" };
  }
  const [hStr, mStr] = startTimeStr.split(":");
  const startH = parseInt(hStr, 10);
  const startM = parseInt(mStr, 10);

  const totalMin = startH * 60 + startM + durationMinutes;
  const dayOffset = Math.floor(totalMin / (24 * 60));
  const remMin = totalMin % (24 * 60);

  const endH = Math.floor(remMin / 60);
  const endM = remMin % 60;

  const time24 = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
  const formatted = formatTime12h(time24, dayOffset);

  return { time: time24, dayOffset, formatted };
}

/**
 * Checks if a given date string (DD-MM-YYYY or ISO) falls on a Friday (lab holiday).
 */
export function isFriday(dateStr: string): boolean {
  if (!dateStr) return false;
  const d = parseDMY(dateStr);
  return d ? d.getDay() === 5 : false;
}

/**
 * Parses DD-MM-YYYY string into a Date object at local midnight.
 */
export function parseDMY(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.trim().split(/[-/.]/);
  if (parts.length === 3) {
    if (parts[0].length <= 2 && parts[1].length <= 2 && parts[2].length === 4) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      const obj = new Date(y, m, d);
      if (!isNaN(obj.getTime())) return obj;
    }
  }
  const fallback = new Date(dateStr);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * Formats a Date object to "DD-MM-YYYY" string.
 */
export function formatToDMY(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Adjusts a date forward to Saturday (+1 day) if it falls on Friday (lab holiday).
 */
export function skipFriday(d: Date): Date {
  const adjusted = new Date(d.getTime());
  if (adjusted.getDay() === 5) {
    // Friday -> Saturday (+1 day)
    adjusted.setDate(adjusted.getDate() + 1);
  }
  return adjusted;
}

/**
 * Adds working laboratory days, skipping Friday holidays whether in-between or final date.
 * If any intermediate step or the final calculated date lands on a Friday, it shifts to Saturday.
 */
export function addDaysSkippingFriday(dateStr: string, daysToAdd: number): string {
  const d = parseDMY(dateStr);
  if (!d) return dateStr;

  let current = skipFriday(d);

  for (let i = 0; i < daysToAdd; i++) {
    current.setDate(current.getDate() + 1);
    current = skipFriday(current);
  }

  return formatToDMY(current);
}

/**
 * Gets the next operating day (skips Friday to Saturday if next day is Friday).
 */
export function getNextOperatingDay(dateStr: string): string {
  return addDaysSkippingFriday(dateStr, 1);
}
