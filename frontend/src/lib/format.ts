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
