/**
 * frontend/src/components/autoclave/AutoclaveCleaningCompleteModal.tsx
 *
 * Modal dialog to record completion of a weekly cleaning schedule item.
 * - Enforces actual_date <= today in laboratory time zone.
 * - Optional notes / remarks.
 * - Done By defaults to current logged-in user or allows selecting other staff if enabled.
 */

import React, { useState } from "react";
import { CleaningScheduleRow, StaffItem } from "../../types";
import { useAuth } from "../../context/AuthContext";
import { getTodayInKolkata } from "../../lib/cleaningShared";

interface AutoclaveCleaningCompleteModalProps {
  item: CleaningScheduleRow;
  staffList: StaffItem[];
  allowSelectOtherStaff: boolean;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { actual_date: string; done_by?: string; notes?: string }) => Promise<void>;
}

export const AutoclaveCleaningCompleteModal: React.FC<AutoclaveCleaningCompleteModalProps> = ({
  item,
  staffList,
  allowSelectOtherStaff,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const { user } = useAuth();
  const { dateStr: todayIstStr } = getTodayInKolkata();

  const [actualDate, setActualDate] = useState<string>(
    item.scheduledDateIso <= todayIstStr ? item.scheduledDateIso : todayIstStr
  );
  const [doneById, setDoneById] = useState<string>(user?.id || "");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actualDate) {
      setErrorMsg("Actual cleaning date is required.");
      return;
    }
    if (actualDate > todayIstStr) {
      setErrorMsg("Cleaning date cannot be in the future (relative to laboratory timezone).");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await onSubmit({
        actual_date: actualDate,
        done_by: allowSelectOtherStaff ? doneById : undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to mark cleaning as complete.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-line overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-line flex items-center justify-between bg-surface/50">
          <div>
            <h3 className="text-base font-semibold text-slate-800">Complete Weekly Cleaning</h3>
            <p className="text-xs text-slate-500">Scheduled Date: {item.scheduledDate}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Actual Cleaning Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              max={todayIstStr}
              value={actualDate}
              onChange={(e) => setActualDate(e.target.value)}
              className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              required
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Cannot exceed today's date in IST ({todayIstStr})
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Cleaned By <span className="text-red-500">*</span>
            </label>
            {allowSelectOtherStaff ? (
              <select
                value={doneById}
                onChange={(e) => setDoneById(e.target.value)}
                className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
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
                disabled
                value={user?.fullName || "Logged-in User"}
                className="w-full text-sm px-3 py-2 bg-slate-100 border border-slate-200 text-slate-600 rounded-lg cursor-not-allowed"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Remarks / Cleaning Notes (optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Chamber thoroughly cleaned with 70% IPA"
              className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-line">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : "Confirm Cleaning"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
