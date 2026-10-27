/**
 * frontend/src/components/autoclave/AutoclaveEntryDrawer.tsx
 *
 * Slide-over drawer for editing an existing autoclave entry.
 * Features:
 *  - Live end time preview calculation labelled "preview, saved value is calculated by the server"
 *  - Manual end time override indicator & "Reset to calculated" button
 *  - Date change guard: if moving to another month, requires confirmation dialog + reason
 *  - Staff selector bound to GET /api/staff (locked if allow_select_other_staff is false)
 *  - Warning when editing a VERIFIED entry (returns to PENDING_VERIFICATION)
 */

import React, { useState, useEffect } from "react";
import { AutoclaveEntry, StaffItem } from "../../types";
import { formatTime12h, previewEndTime } from "../../lib/format";
import { apiFetch } from "../../lib/api";

interface Props {
  entry: AutoclaveEntry | null;
  onClose: () => void;
  onSaved: () => void;
  allowSelectOtherStaff: boolean;
  defaultDurationMinutes: number;
}

export const AutoclaveEntryDrawer: React.FC<Props> = ({
  entry,
  onClose,
  onSaved,
  allowSelectOtherStaff,
  defaultDurationMinutes,
}) => {
  if (!entry) return null;

  // Form states
  const [logDate, setLogDate] = useState<string>("");
  const [loadDescription, setLoadDescription] = useState<string>("");
  const [autoclaveStartTime, setAutoclaveStartTime] = useState<string>("");
  const [sterilizationStartTime, setSterilizationStartTime] = useState<string>("");
  const [temperatureC, setTemperatureC] = useState<number>(121);
  const [pressureValue, setPressureValue] = useState<number>(15);
  const [pressureUnit, setPressureUnit] = useState<string>("LBS");
  const [endTime, setEndTime] = useState<string>("");
  const [isOverridden, setIsOverridden] = useState<boolean>(false);
  const [doneById, setDoneById] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [reason, setReason] = useState<string>("");

  // Staff list
  const [staffList, setStaffList] = useState<StaffItem[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Month change confirmation modal
  const [showMonthChangeModal, setShowMonthChangeModal] = useState<boolean>(false);

  // Populate initial values
  useEffect(() => {
    if (entry) {
      // logDate comes as DD-MM-YYYY, convert to YYYY-MM-DD for <input type="date">
      const parts = entry.logDate.split("-");
      const isoDate = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : entry.logDate;
      setLogDate(isoDate);
      setLoadDescription(entry.loadDescription);
      setAutoclaveStartTime(entry.autoclaveStartTime);
      setSterilizationStartTime(entry.sterilizationStartTime);
      setTemperatureC(entry.temperatureC);
      setPressureValue(entry.pressureValue);
      setPressureUnit(entry.pressureUnit);
      setEndTime(entry.endTime);
      setIsOverridden(entry.endTimeOverridden);
      setDoneById(entry.doneById);
      setNotes(entry.notes || "");
      setReason("");
      setError(null);
    }
  }, [entry]);

  // Load staff list
  useEffect(() => {
    apiFetch<StaffItem[]>("/api/v1/staff")
      .then((data) => setStaffList(data))
      .catch((err) => console.error(err));
  }, []);

  // Live preview calculation when sterilization start time changes and not overridden
  const preview = previewEndTime(sterilizationStartTime, defaultDurationMinutes);

  // Reset end time to calculated
  const handleResetEndTime = async () => {
    try {
      const updated = await apiFetch<AutoclaveEntry>(
        `/api/v1/autoclave/entries/${entry.id}/reset-end-time`,
        { method: "POST" }
      );
      setEndTime(updated.endTime);
      setIsOverridden(false);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSaveAttempt = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Check if month changed
    const originalParts = entry.logDate.split("-"); // [DD, MM, YYYY]
    const origMonth = originalParts.length === 3 ? `${originalParts[2]}-${originalParts[1]}` : "";
    const newMonth = logDate.slice(0, 7);

    if (origMonth && newMonth && origMonth !== newMonth) {
      setShowMonthChangeModal(true);
      return;
    }

    executeSave(false);
  };

  const executeSave = async (confirmMonthChange: boolean) => {
    setSubmitting(true);
    setError(null);
    try {
      const payload: any = {
        log_date: logDate,
        load_description: loadDescription,
        autoclave_start_time: autoclaveStartTime,
        sterilization_start_time: sterilizationStartTime,
        temperature_c: temperatureC,
        pressure_value: pressureValue,
        pressure_unit: pressureUnit,
        done_by: doneById,
        notes: notes.trim() || undefined,
        reason: reason.trim() || undefined,
      };

      if (isOverridden) {
        payload.end_time = endTime;
      }

      if (confirmMonthChange) {
        payload.confirm_month_change = true;
      }

      await apiFetch(`/api/v1/autoclave/entries/${entry.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      setShowMonthChangeModal(false);
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to update entry.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-white shadow-2xl z-50 flex flex-col font-sans">
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div>
            <h3 className="text-base font-bold text-gray-900">Edit Autoclave Log Entry</h3>
            <p className="text-xs text-gray-500">ID: {entry.id}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg font-bold px-2 py-1"
          >
            ×
          </button>
        </div>

        {/* Warning if verified */}
        {entry.verificationStatus === "VERIFIED" && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 text-xs text-amber-900">
            <strong>Warning:</strong> This entry is currently marked <strong>Verified</strong>. Editing will revert the status to <strong>Pending verification</strong> and requires a reason.
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-b border-red-200 px-6 py-3 text-xs text-red-800">
            {error}
          </div>
        )}

        {/* Drawer Form Body */}
        <form id="drawer-form" onSubmit={handleSaveAttempt} className="flex-1 overflow-y-auto px-6 py-5 space-y-4 text-sm">
          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-gray-700">Date *</label>
            <input
              type="date"
              required
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
            />
          </div>

          {/* Name of Cycle Load */}
          <div>
            <label className="block text-xs font-semibold text-gray-700">Name of Cycle Load *</label>
            <input
              type="text"
              required
              value={loadDescription}
              onChange={(e) => setLoadDescription(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded px-3 py-1.5 text-sm font-medium"
            />
          </div>

          {/* Times Section */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700">Autoclave Start Time (24h) *</label>
              <input
                type="time"
                required
                value={autoclaveStartTime}
                onChange={(e) => setAutoclaveStartTime(e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
              />
              <span className="text-[11px] text-gray-400 block mt-0.5">
                {formatTime12h(autoclaveStartTime)}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700">Sterilization Start Time (24h) *</label>
              <input
                type="time"
                required
                value={sterilizationStartTime}
                onChange={(e) => setSterilizationStartTime(e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
              />
              <span className="text-[11px] text-gray-400 block mt-0.5">
                {formatTime12h(sterilizationStartTime)}
              </span>
            </div>
          </div>

          {/* End Time with Preview & Override */}
          <div className="bg-gray-50 border border-gray-200 rounded p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-gray-800">
                Sterilization End Time
              </label>
              {isOverridden ? (
                <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-semibold">
                  Manually Overridden
                </span>
              ) : (
                <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-medium">
                  Auto-calculated
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <input
                type="time"
                value={endTime}
                onChange={(e) => {
                  setEndTime(e.target.value);
                  setIsOverridden(true);
                }}
                className="w-36 border border-gray-300 rounded px-2.5 py-1 text-sm bg-white"
              />
              <span className="text-xs font-semibold text-gray-700">
                {formatTime12h(endTime, entry.endDateOffset)}
              </span>
            </div>

            {!isOverridden && (
              <p className="text-[11px] text-gray-500 italic">
                Live preview: {preview.formatted} (duration: {defaultDurationMinutes} min).
                <span className="block text-[10px] text-gray-400 font-normal">
                  * preview, saved value is calculated by the server
                </span>
              </p>
            )}

            {isOverridden && (
              <button
                type="button"
                onClick={handleResetEndTime}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium underline"
              >
                Reset to calculated ({preview.formatted})
              </button>
            )}
          </div>

          {/* Temperature & Pressure */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700">Temperature (°C) *</label>
              <input
                type="number"
                step="0.1"
                required
                value={temperatureC}
                onChange={(e) => setTemperatureC(parseFloat(e.target.value))}
                className="mt-1 w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700">Pressure *</label>
              <div className="flex gap-2 mt-1">
                <input
                  type="number"
                  step="0.1"
                  required
                  value={pressureValue}
                  onChange={(e) => setPressureValue(parseFloat(e.target.value))}
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                />
                <input
                  type="text"
                  required
                  value={pressureUnit}
                  onChange={(e) => setPressureUnit(e.target.value)}
                  className="w-20 border border-gray-300 rounded px-2 py-1.5 text-sm font-semibold uppercase text-center"
                />
              </div>
            </div>
          </div>

          {/* Done By Selection */}
          <div>
            <label className="block text-xs font-semibold text-gray-700">Done By (Responsible Staff) *</label>
            {allowSelectOtherStaff ? (
              <select
                value={doneById}
                onChange={(e) => setDoneById(e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded px-3 py-1.5 text-sm bg-white"
              >
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} ({s.role})
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                readOnly
                value={entry.doneBy}
                className="mt-1 w-full border border-gray-200 bg-gray-100 rounded px-3 py-1.5 text-sm text-gray-600 cursor-not-allowed"
                title="Staff selection is locked in settings"
              />
            )}
          </div>

          {/* Reason for Edit */}
          <div>
            <label className="block text-xs font-semibold text-gray-700">
              Reason for Change {entry.verificationStatus === "VERIFIED" ? "*" : "(Optional)"}
            </label>
            <input
              type="text"
              placeholder="e.g. Adjusted start time after supervisor review"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-700">Notes (Optional)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
            />
          </div>
        </form>

        {/* Drawer Footer Actions */}
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded text-sm text-gray-700 hover:bg-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="drawer-form"
            disabled={submitting || (entry.verificationStatus === "VERIFIED" && !reason.trim())}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-semibold disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Month Change Confirmation Modal */}
      {showMonthChangeModal && (
        <div className="fixed inset-0 bg-black/60 z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-5 space-y-4 shadow-2xl">
            <h4 className="text-base font-bold text-gray-900">Confirm Month Change</h4>
            <p className="text-xs text-gray-600">
              Changing the date to <strong>{logDate}</strong> will move this entry from its current reporting month into another month.
            </p>

            <div>
              <label className="block text-xs font-semibold text-gray-700">Reason for moving month *</label>
              <input
                type="text"
                required
                placeholder="Reason is required to confirm month move"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setShowMonthChangeModal(false)}
                className="px-3 py-1.5 border border-gray-300 rounded text-xs text-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!reason.trim()}
                onClick={() => executeSave(true)}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold disabled:opacity-50"
              >
                Confirm Move
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
