/**
 * frontend/src/components/autoclave/AutoclaveCleaningPanel.tsx
 *
 * Dedicated Panel for Autoclave Weekly Cleaning Schedule (Phase 6).
 * - Displays all scheduled weekly cleaning dates for the month.
 * - Shows status chip: COMPLETED (emerald), SCHEDULED (amber/slate), OVERDUE (rose).
 * - "Generate / Refresh Schedule" button calling backend API.
 * - Actions: "Mark Complete", "Reopen" (with reason modal for Admin/Verifier), "History".
 */

import React, { useState } from "react";
import { CleaningScheduleRow, StaffItem, AuditHistoryItem } from "../../types";
import { AutoclaveCleaningCompleteModal } from "./AutoclaveCleaningCompleteModal";
import { AutoclaveHistoryDrawer } from "./AutoclaveHistoryDrawer";
import { useAuth } from "../../context/AuthContext";

interface AutoclaveCleaningPanelProps {
  month: string; // YYYY-MM
  scheduleRows: CleaningScheduleRow[];
  staffList: StaffItem[];
  allowSelectOtherStaff: boolean;
  canManage: boolean; // Admin or Analyst
  canVerifyOrAdmin: boolean; // Admin or Verifier
  onGenerateSchedule: () => Promise<void>;
  onCompleteCleaning: (id: string, data: { actual_date: string; done_by?: string; notes?: string }) => Promise<void>;
  onReopenCleaning: (id: string, reason: string) => Promise<void>;
  onFetchHistory: (id: string) => Promise<AuditHistoryItem[]>;
}

export const AutoclaveCleaningPanel: React.FC<AutoclaveCleaningPanelProps> = ({
  month,
  scheduleRows,
  staffList,
  allowSelectOtherStaff,
  canManage,
  canVerifyOrAdmin,
  onGenerateSchedule,
  onCompleteCleaning,
  onReopenCleaning,
  onFetchHistory,
}) => {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [completeTarget, setCompleteTarget] = useState<CleaningScheduleRow | null>(null);

  // Reopen prompt state
  const [reopenTarget, setReopenTarget] = useState<CleaningScheduleRow | null>(null);
  const [reopenReason, setReopenReason] = useState<string>("");
  const [isReopening, setIsReopening] = useState<boolean>(false);
  const [reopenError, setReopenError] = useState<string | null>(null);

  // History state
  const [historyTarget, setHistoryTarget] = useState<{ id: string; title: string } | null>(null);
  const [historyItems, setHistoryItems] = useState<AuditHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  const handleGenerateClick = async () => {
    try {
      setIsGenerating(true);
      await onGenerateSchedule();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReopenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopenTarget) return;
    if (!reopenReason.trim()) {
      setReopenError("Reason is mandatory to reopen a completed cleaning entry.");
      return;
    }
    try {
      setIsReopening(true);
      setReopenError(null);
      await onReopenCleaning(reopenTarget.id, reopenReason.trim());
      setReopenTarget(null);
      setReopenReason("");
    } catch (err: any) {
      setReopenError(err?.message || "Failed to reopen cleaning entry.");
    } finally {
      setIsReopening(false);
    }
  };

  const handleOpenHistory = async (row: CleaningScheduleRow) => {
    try {
      setHistoryTarget({
        id: row.id,
        title: `Cleaning Schedule — ${row.scheduledDate}`,
      });
      setIsLoadingHistory(true);
      const items = await onFetchHistory(row.id);
      setHistoryItems(items);
    } catch (err) {
      console.error("Failed to load cleaning history", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-line shadow-sm overflow-hidden mb-8" id="cleaning-schedule-section">
      <div className="px-6 py-4 border-b border-line bg-surface/30 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-800">Weekly Cleaning Schedule</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
              Month: {month}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Cleaning is tracked independently from sterilization cycle verification.
          </p>
        </div>

        {canManage && (
          <button
            onClick={handleGenerateClick}
            disabled={isGenerating}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <span>🧹</span>
            <span>{isGenerating ? "Generating..." : "Generate / Refresh Cleaning Schedule"}</span>
          </button>
        )}
      </div>

      {scheduleRows.length === 0 ? (
        <div className="p-8 text-center">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-lg mx-auto mb-2 text-slate-400">
            📅
          </div>
          <p className="text-sm font-medium text-slate-700">Cleaning schedule not generated yet</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
            Click "Generate / Refresh Cleaning Schedule" to create standard cleaning dates for {month} based on laboratory settings.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-line text-slate-600 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Scheduled Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Actual Cleaned Date</th>
                <th className="py-3 px-4">Cleaned By</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-slate-700">
              {scheduleRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-4 font-medium text-slate-800">
                    {row.scheduledDate}
                  </td>
                  <td className="py-3 px-4">
                    {row.statusDisplay === "COMPLETED" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        COMPLETED
                      </span>
                    )}
                    {row.statusDisplay === "OVERDUE" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                        OVERDUE
                      </span>
                    )}
                    {row.statusDisplay === "SCHEDULED" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                        SCHEDULED
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {row.actualDate ? (
                      <span className="font-medium text-slate-800">{row.actualDate}</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {row.doneBy ? (
                      <span className="text-slate-700">{row.doneBy}</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      {row.status !== "COMPLETED" && (user?.role === "admin" || user?.role === "analyst" || user?.role === "verifier") && (
                        <button
                          onClick={() => setCompleteTarget(row)}
                          className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-primary text-white hover:bg-primary-hover shadow-xs transition-colors"
                        >
                          Mark Complete
                        </button>
                      )}

                      {row.status === "COMPLETED" && canVerifyOrAdmin && (
                        <button
                          onClick={() => setReopenTarget(row)}
                          className="px-2.5 py-1 text-[11px] font-medium rounded-md border border-amber-300 text-amber-700 hover:bg-amber-50 transition-colors"
                        >
                          Reopen
                        </button>
                      )}

                      <button
                        onClick={() => handleOpenHistory(row)}
                        className="px-2 py-1 text-[11px] text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
                      >
                        History
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Completion Modal */}
      {completeTarget && (
        <AutoclaveCleaningCompleteModal
          item={completeTarget}
          staffList={staffList}
          allowSelectOtherStaff={allowSelectOtherStaff}
          isOpen={true}
          onClose={() => setCompleteTarget(null)}
          onSubmit={async (data) => {
            await onCompleteCleaning(completeTarget.id, data);
          }}
        />
      )}

      {/* Reopen Prompt Modal */}
      {reopenTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-line overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-line flex items-center justify-between bg-surface/50">
              <h3 className="text-base font-semibold text-slate-800">Reopen Cleaning Record</h3>
              <button
                onClick={() => setReopenTarget(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleReopenSubmit} className="p-6 space-y-4">
              {reopenError && (
                <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg">
                  {reopenError}
                </div>
              )}
              <p className="text-xs text-slate-600">
                You are reopening the cleaning record for scheduled date{" "}
                <span className="font-semibold">{reopenTarget.scheduledDate}</span>. Its status will return to{" "}
                <span className="font-semibold">SCHEDULED</span> and completion details will be cleared.
              </p>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Reason for Reopening <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  placeholder="e.g. Completed date was mistyped, re-entering details"
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-line">
                <button
                  type="button"
                  onClick={() => setReopenTarget(null)}
                  disabled={isReopening}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isReopening}
                  className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {isReopening ? "Reopening..." : "Confirm Reopen"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Drawer */}
      <AutoclaveHistoryDrawer
        isOpen={Boolean(historyTarget)}
        onClose={() => setHistoryTarget(null)}
        entryTitle={historyTarget?.title || ""}
        history={historyItems}
        isLoading={isLoadingHistory}
      />
    </div>
  );
};
