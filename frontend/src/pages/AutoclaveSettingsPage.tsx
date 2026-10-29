/**
 * frontend/src/pages/AutoclaveSettingsPage.tsx
 *
 * Autoclave Settings Management (Phase 5 Section G).
 * Features:
 * 1. Default values (start time, temp, pressure, duration) with notice:
 *    "Changing defaults only affects newly generated entries. Saved entries are not changed."
 * 2. Cycle grouping mode: "One cycle per date" (read-only label).
 * 3. Weekly cleaning rule: anchor day (1), second day (7), interval (7) with live preview of September pattern.
 * 4. Equipment details (Format No, Ref SOP No, Equipment No).
 * 5. Staff policy: toggle "Allow selecting another responsible staff member".
 * 6. Acceptance limits: min/max temp and pressure (empty by default).
 * 7. Load types manager.
 */

import React, { useState, useEffect } from "react";
import { AutoclaveSettingsResponse } from "../types";
import { apiFetch } from "../lib/api";
import { generateCleaningDates } from "../lib/cleaningShared";

export const AutoclaveSettingsPage: React.FC = () => {
  const [equipment, setEquipment] = useState<any>(null);

  // Form states
  const [startTime, setStartTime] = useState<string>("11:00");
  const [sterStart, setSterStart] = useState<string>("12:00");
  const [tempC, setTempC] = useState<number>(121);
  const [pressureVal, setPressureVal] = useState<number>(15);
  const [pressureUnit, setPressureUnit] = useState<string>("LBS");
  const [duration, setDuration] = useState<number>(15);

  const [cleaningFirstDay, setCleaningFirstDay] = useState<number>(1);
  const [cleaningSecondDay, setCleaningSecondDay] = useState<number>(7);
  const [cleaningInterval, setCleaningInterval] = useState<number>(7);

  const [allowOtherStaff, setAllowOtherStaff] = useState<boolean>(true);

  const [tempMin, setTempMin] = useState<string>("");
  const [tempMax, setTempMax] = useState<string>("");
  const [pressMin, setPressMin] = useState<string>("");
  const [pressMax, setPressMax] = useState<string>("");

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const loadData = async () => {
    try {
      const [settingsRes, equipRes] = await Promise.all([
        apiFetch<AutoclaveSettingsResponse>("/api/v1/autoclave/settings"),
        apiFetch<any[]>("/api/v1/autoclave/equipment"),
      ]);

      const s = settingsRes.settings;
      setStartTime(s.autoclave_start_time ?? "11:00");
      setSterStart(s.sterilization_start_time ?? "12:00");
      setTempC(s.temperature_c ?? 121);
      setPressureVal(s.pressure_value ?? 15);
      setPressureUnit(s.pressure_unit ?? "LBS");
      setDuration(s.sterilization_duration_minutes ?? 15);

      setCleaningFirstDay(s.cleaning_first_day ?? 1);
      setCleaningSecondDay(s.cleaning_second_day ?? 7);
      setCleaningInterval(s.cleaning_interval_days ?? 7);

      setAllowOtherStaff(s.allow_select_other_staff ?? true);

      setTempMin(s.temperature_min_c !== null && s.temperature_min_c !== undefined ? String(s.temperature_min_c) : "");
      setTempMax(s.temperature_max_c !== null && s.temperature_max_c !== undefined ? String(s.temperature_max_c) : "");
      setPressMin(s.pressure_min !== null && s.pressure_min !== undefined ? String(s.pressure_min) : "");
      setPressMax(s.pressure_max !== null && s.pressure_max !== undefined ? String(s.pressure_max) : "");

      if (equipRes.length > 0) setEquipment(equipRes[0]);
    } catch (err: any) {
      setError(err.message || "Failed to load settings.");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setToastMessage(null);
    setError(null);
    try {
      const payload: any = {
        autoclave_start_time: startTime,
        sterilization_start_time: sterStart,
        temperature_c: tempC,
        pressure_value: pressureVal,
        pressure_unit: pressureUnit,
        sterilization_duration_minutes: duration,
        cleaning_first_day: cleaningFirstDay,
        cleaning_second_day: cleaningSecondDay,
        cleaning_interval_days: cleaningInterval,
        allow_select_other_staff: allowOtherStaff,
        temperature_min_c: tempMin.trim() === "" ? null : parseFloat(tempMin),
        temperature_max_c: tempMax.trim() === "" ? null : parseFloat(tempMax),
        pressure_min: pressMin.trim() === "" ? null : parseFloat(pressMin),
        pressure_max: pressMax.trim() === "" ? null : parseFloat(pressMax),
      };

      await apiFetch("/api/v1/autoclave/settings", {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      setToastMessage(
        "Saved. Existing schedule rows were not changed. Click Generate Cleaning Schedule to apply the new rule to future dates."
      );
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to save settings.");
    } finally {
      setSubmitting(false);
    }
  };

  // Live preview dates for cleaning schedule (e.g. September pattern: 1, 7, 14, 21, 28)
  const getCleaningPreviewDays = () => {
    try {
      const dates = generateCleaningDates({
        year: 2026,
        month: 9,
        firstDay: cleaningFirstDay,
        secondDay: cleaningSecondDay,
        intervalDays: cleaningInterval,
      });
      return dates.map((d) => parseInt(d.slice(8), 10)).join(", ");
    } catch {
      return "Invalid rule parameters";
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 font-sans">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Autoclave Configuration & Settings</h1>
        <p className="text-sm text-gray-500">Equipment parameters, planned defaults, weekly schedule rules, and limits.</p>
      </div>

      {toastMessage && (
        <div className="bg-green-50 border border-green-200 text-green-900 px-4 py-3 rounded text-sm font-semibold">
          {toastMessage}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-900 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* 1. Default Values */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-4">
          <div className="border-b pb-2">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">1. Cycle Planned Defaults</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Changing defaults only affects newly generated entries. Saved entries are not changed.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <label className="block text-xs font-semibold text-gray-700">Autoclave Start Time (24h)</label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="mt-1 w-full border rounded px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700">Sterilization Start Time (24h)</label>
              <input
                type="time"
                required
                value={sterStart}
                onChange={(e) => setSterStart(e.target.value)}
                className="mt-1 w-full border rounded px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700">Duration (Minutes)</label>
              <input
                type="number"
                min="1"
                required
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value, 10))}
                className="mt-1 w-full border rounded px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700">Temperature (°C)</label>
              <input
                type="number"
                step="0.1"
                required
                value={tempC}
                onChange={(e) => setTempC(parseFloat(e.target.value))}
                className="mt-1 w-full border rounded px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700">Pressure Value</label>
              <input
                type="number"
                step="0.1"
                required
                value={pressureVal}
                onChange={(e) => setPressureVal(parseFloat(e.target.value))}
                className="mt-1 w-full border rounded px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700">Pressure Unit</label>
              <input
                type="text"
                required
                value={pressureUnit}
                onChange={(e) => setPressureUnit(e.target.value)}
                className="mt-1 w-full border rounded px-3 py-1.5 text-sm font-bold uppercase"
              />
            </div>
          </div>
        </div>

        {/* 2. Grouping & Cycle Policy */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-2">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">2. Cycle Grouping Mode</h3>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800">
              ONE_CYCLE_PER_DATE
            </span>
            <span className="text-xs text-gray-600">
              One autoclave cycle per date covering all samples registered on that date. Extra loads added manually.
            </span>
          </div>
        </div>

        {/* 3. Weekly Cleaning Rule */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-4">
          <div className="border-b pb-2">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">3. Weekly Cleaning Schedule Rule</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              First interval is 6 days, then 7-day intervals. Confirmed by the laboratory.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <label className="block text-xs font-semibold text-gray-700">First Day (Anchor)</label>
              <input
                type="number"
                min="1"
                max="28"
                required
                value={cleaningFirstDay}
                onChange={(e) => setCleaningFirstDay(parseInt(e.target.value, 10))}
                className="mt-1 w-full border rounded px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700">Second Day (Interval 1)</label>
              <input
                type="number"
                min="2"
                max="28"
                required
                value={cleaningSecondDay}
                onChange={(e) => setCleaningSecondDay(parseInt(e.target.value, 10))}
                className="mt-1 w-full border rounded px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700">Subsequent Interval (Days)</label>
              <input
                type="number"
                min="1"
                required
                value={cleaningInterval}
                onChange={(e) => setCleaningInterval(parseInt(e.target.value, 10))}
                className="mt-1 w-full border rounded px-3 py-1.5 text-sm"
              />
            </div>
          </div>

          <div className="bg-gray-50 p-3 rounded text-xs text-gray-700">
            <strong>Preview days for September (30-day month):</strong> Days {getCleaningPreviewDays()}
            <span className="block text-[11px] text-gray-400 mt-0.5 font-normal">
              Applied automatically when you generate the cleaning schedule on the Autoclave Log Book page.
            </span>
          </div>
        </div>

        {/* 4. Equipment Details */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">4. Equipment Details (Read-only)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
            <div className="bg-gray-50 p-2.5 rounded border">
              <span className="block font-sans text-gray-500 font-semibold">Format No.</span>
              <span className="text-gray-900 font-bold">{equipment?.formatNo || "QC/M/023/F/01"}</span>
            </div>
            <div className="bg-gray-50 p-2.5 rounded border">
              <span className="block font-sans text-gray-500 font-semibold">Ref SOP No.</span>
              <span className="text-gray-900 font-bold">{equipment?.refSopNo || "PM/QC/M/023"}</span>
            </div>
            <div className="bg-gray-50 p-2.5 rounded border">
              <span className="block font-sans text-gray-500 font-semibold">Equipment No.</span>
              <span className="text-gray-900 font-bold">{equipment?.equipmentNo || "PM/QC/M/01"}</span>
            </div>
          </div>
        </div>

        {/* 5. Staff Policy */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-2">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">5. Staff Policy</h3>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={allowOtherStaff}
              onChange={(e) => setAllowOtherStaff(e.target.checked)}
              className="rounded text-blue-600 w-4 h-4"
            />
            <span className="text-sm font-medium text-gray-800">
              Allow selecting another responsible staff member in "Done By"
            </span>
          </label>
        </div>

        {/* 6. Acceptance Limits */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-3">
          <div className="border-b pb-2">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">6. Acceptance Limits</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Leave empty until limits are approved by the laboratory. These limits never mark a cycle as successful.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <label className="block text-xs font-semibold text-gray-700">Temp Min (°C)</label>
              <input
                type="number"
                step="0.1"
                placeholder="Unset"
                value={tempMin}
                onChange={(e) => setTempMin(e.target.value)}
                className="mt-1 w-full border rounded px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700">Temp Max (°C)</label>
              <input
                type="number"
                step="0.1"
                placeholder="Unset"
                value={tempMax}
                onChange={(e) => setTempMax(e.target.value)}
                className="mt-1 w-full border rounded px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700">Pressure Min</label>
              <input
                type="number"
                step="0.1"
                placeholder="Unset"
                value={pressMin}
                onChange={(e) => setPressMin(e.target.value)}
                className="mt-1 w-full border rounded px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700">Pressure Max</label>
              <input
                type="number"
                step="0.1"
                placeholder="Unset"
                value={pressMax}
                onChange={(e) => setPressMax(e.target.value)}
                className="mt-1 w-full border rounded px-3 py-1.5 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex justify-end pt-3">
          <button
            type="submit"
            disabled={submitting}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded text-sm shadow transition disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save Autoclave Settings"}
          </button>
        </div>
      </form>
    </div>
  );
};
