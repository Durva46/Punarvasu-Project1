/**
 * frontend/src/components/autoclave/AutoclaveVerifyModal.tsx
 *
 * Verifier/Admin modal to record verified actual readings.
 * Never shows 'successful' or 'passed'.
 */

import React, { useState } from "react";
import { AutoclaveEntry } from "../../types";
import { formatTime12h } from "../../lib/format";
import { apiFetch } from "../../lib/api";

interface Props {
  entry: AutoclaveEntry | null;
  onClose: () => void;
  onVerified: () => void;
}

export const AutoclaveVerifyModal: React.FC<Props> = ({ entry, onClose, onVerified }) => {
  if (!entry) return null;

  const [actualTemp, setActualTemp] = useState<number>(entry.actualTemperatureC ?? entry.temperatureC);
  const [actualPressure, setActualPressure] = useState<number>(entry.actualPressureValue ?? entry.pressureValue);
  const [actualStart, setActualStart] = useState<string>(entry.actualStartTime ?? entry.sterilizationStartTime);
  const [actualEnd, setActualEnd] = useState<string>(entry.actualEndTime ?? entry.endTime);
  const [notes, setNotes] = useState<string>(entry.notes ?? "");

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch(`/api/v1/autoclave/entries/${entry.id}/verify`, {
        method: "POST",
        body: JSON.stringify({
          actual_temperature_c: actualTemp,
          actual_pressure_value: actualPressure,
          actual_start_time: actualStart,
          actual_end_time: actualEnd,
          actual_pressure_unit: entry.pressureUnit,
          notes: notes.trim() || undefined,
        }),
      });
      onVerified();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to verify entry.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-2xl space-y-4">
        <div className="border-b pb-3">
          <h3 className="text-base font-bold text-gray-900">Verify Sterilization Readings</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {entry.loadDescription} ({entry.logDate})
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4 text-sm">
          <div className="bg-gray-50 border rounded p-3 text-xs grid grid-cols-2 gap-2 text-gray-600">
            <div><strong>Planned Start:</strong> {formatTime12h(entry.sterilizationStartTime)}</div>
            <div><strong>Planned End:</strong> {formatTime12h(entry.endTime, entry.endDateOffset)}</div>
            <div><strong>Planned Temp:</strong> {entry.temperatureC} °C</div>
            <div><strong>Planned Pressure:</strong> {entry.pressureValue} {entry.pressureUnit}</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700">Actual Start Time (24h) *</label>
              <input
                type="time"
                required
                value={actualStart}
                onChange={(e) => setActualStart(e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
              />
              <span className="text-[11px] text-gray-500 block mt-0.5">{formatTime12h(actualStart)}</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700">Actual End Time (24h) *</label>
              <input
                type="time"
                required
                value={actualEnd}
                onChange={(e) => setActualEnd(e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
              />
              <span className="text-[11px] text-gray-500 block mt-0.5">{formatTime12h(actualEnd)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700">Actual Temperature (°C) *</label>
              <input
                type="number"
                step="0.1"
                required
                value={actualTemp}
                onChange={(e) => setActualTemp(parseFloat(e.target.value))}
                className="mt-1 w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700">Actual Pressure ({entry.pressureUnit}) *</label>
              <input
                type="number"
                step="0.1"
                required
                value={actualPressure}
                onChange={(e) => setActualPressure(parseFloat(e.target.value))}
                className="mt-1 w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700">Verification Notes</label>
            <input
              type="text"
              placeholder="e.g. Temperature chart verified against autoclave printout"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded text-sm font-semibold disabled:opacity-50"
            >
              {submitting ? "Verifying..." : "Verify & Sign Off"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
