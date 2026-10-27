/**
 * frontend/src/pages/MediaPage.tsx
 *
 * Media Preparation Page (Step 1).
 * Features:
 * 1. Header card for selected date with read-only sample counts (S, W, N, PC, NC).
 * 2. First-run opening balance prompt (red warning if < 10 gm).
 * 3. Media preparation table with badges and formula tooltips.
 * 4. Modals: Edit Opening Balance, Refill (with shortfall calculation), Override Quantity.
 */

import React, { useState, useEffect } from "react";
import { apiFetch } from "../lib/api";
import { formatGrams } from "../lib/format";
import { MediaRecordsResponse, MediaPreparationRow } from "../types";

export const MediaPage: React.FC = () => {
  const [reportId, setReportId] = useState<string>("");
  const [availableReports, setAvailableReports] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [data, setData] = useState<MediaRecordsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initial balance prompt state
  const [initialBalance, setInitialBalance] = useState<string>("500");
  const [initialPromptSubmitting, setInitialPromptSubmitting] = useState(false);

  // Modals state
  const [editRow, setEditRow] = useState<MediaPreparationRow | null>(null);
  const [editBalanceVal, setEditBalanceVal] = useState<string>("");
  const [editReason, setEditReason] = useState<string>("");

  const [refillRow, setRefillRow] = useState<MediaPreparationRow | null>(null);
  const [refillBalanceVal, setRefillBalanceVal] = useState<string>("");
  const [refillReason, setRefillReason] = useState<string>("");

  const [overrideRow, setOverrideRow] = useState<MediaPreparationRow | null>(null);
  const [overrideQtyVal, setOverrideQtyVal] = useState<string>("");
  const [overrideReason, setOverrideReason] = useState<string>("");

  // Load available reports on mount
  useEffect(() => {
    apiFetch<any[]>("/api/v1/imports")
      .then((reports) => {
        setAvailableReports(reports);
        if (reports.length > 0) {
          setReportId(reports[0].id);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  // Fetch records whenever report or date changes
  const fetchRecords = async () => {
    if (!reportId) return;
    setLoading(true);
    setError(null);
    try {
      const url = selectedDate
        ? `/api/v1/media/records?report_id=${reportId}&date=${selectedDate}`
        : `/api/v1/media/records?report_id=${reportId}`;
      const res = await apiFetch<MediaRecordsResponse>(url);
      setData(res);
      if (res.header.isoDate && !selectedDate) {
        setSelectedDate(res.header.isoDate);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load media preparation records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [reportId, selectedDate]);

  // Handle Initial Balance Submission
  const handleSetInitialBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportId) return;
    setInitialPromptSubmitting(true);
    setError(null);
    try {
      await apiFetch("/api/v1/media/opening-balance/initial", {
        method: "POST",
        body: JSON.stringify({
          report_id: reportId,
          opening_balance_gm: parseFloat(initialBalance),
        }),
      });
      await fetchRecords();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setInitialPromptSubmitting(false);
    }
  };

  // Handle Edit Balance
  const handleEditBalance = async () => {
    if (!editRow || !reportId) return;
    try {
      await apiFetch("/api/v1/media/opening-balance/edit", {
        method: "POST",
        body: JSON.stringify({
          report_id: reportId,
          media_id: editRow.mediaId,
          date: editRow.isoDate,
          new_opening_balance_gm: parseFloat(editBalanceVal),
          reason: editReason,
        }),
      });
      setEditRow(null);
      await fetchRecords();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Handle Refill
  const handleRefill = async () => {
    if (!refillRow) return;
    try {
      await apiFetch("/api/v1/media/refill", {
        method: "POST",
        body: JSON.stringify({
          media_prep_record_id: refillRow.id,
          new_opening_balance_gm: parseFloat(refillBalanceVal),
          reason: refillReason,
        }),
      });
      setRefillRow(null);
      await fetchRecords();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Handle Override
  const handleOverride = async () => {
    if (!overrideRow) return;
    try {
      await apiFetch("/api/v1/media/override-quantity", {
        method: "POST",
        body: JSON.stringify({
          media_prep_record_id: overrideRow.id,
          quantity_used_gm: parseFloat(overrideQtyVal),
          reason: overrideReason,
        }),
      });
      setOverrideRow(null);
      await fetchRecords();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETE":
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Ready</span>;
      case "LOW_STOCK":
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">Low Stock</span>;
      case "REFILL_REQUIRED":
      case "CALCULATION_BLOCKED":
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">Calculation Blocked</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header & Report Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Media Preparation Record</h1>
          <p className="text-sm text-gray-500">PETLAD MAHAL AROGYA MANDAL PHARMACY — Laboratory Management</p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Report:</label>
          <select
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white shadow-sm"
            value={reportId}
            onChange={(e) => {
              setReportId(e.target.value);
              setSelectedDate("");
            }}
          >
            {availableReports.map((r) => (
              <option key={r.id} value={r.id}>
                {r.fileName} ({r.reportingMonth})
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      {/* Date Header Card (Read-only counts from backend) */}
      {data && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <span className="block text-xs font-medium text-gray-500 uppercase">Selected Date</span>
            <span className="text-base font-semibold text-gray-900">{data.header.date || "-"}</span>
          </div>
          <div>
            <span className="block text-xs font-medium text-gray-500 uppercase">Total Samples (S)</span>
            <span className="text-base font-semibold text-gray-900">{data.header.totalSamples}</span>
          </div>
          <div>
            <span className="block text-xs font-medium text-gray-500 uppercase">Water Samples (W)</span>
            <span className="text-base font-semibold text-blue-600">{data.header.waterSamples}</span>
          </div>
          <div>
            <span className="block text-xs font-medium text-gray-500 uppercase">Non-Water (N)</span>
            <span className="text-base font-semibold text-gray-900">{data.header.nonWaterSamples}</span>
          </div>
          <div>
            <span className="block text-xs font-medium text-gray-500 uppercase">Positive Control</span>
            <span className="text-base font-semibold text-gray-900">{data.header.positiveControl}</span>
          </div>
          <div>
            <span className="block text-xs font-medium text-gray-500 uppercase">Negative Control</span>
            <span className="text-base font-semibold text-gray-900">{data.header.negativeControl}</span>
          </div>
        </div>
      )}

      {/* First-Run Opening Balance Prompt */}
      {data && data.header.requiresInitialBalance && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
          <h3 className="text-base font-semibold text-amber-900">Initial Opening Balance Required</h3>
          <p className="text-sm text-amber-800 mt-1">
            Please enter the starting opening balance for this report. This value will seed all media for the first date.
          </p>

          <form onSubmit={handleSetInitialBalance} className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm w-36 shadow-sm"
                placeholder="in grams"
              />
              <span className="text-sm font-medium text-gray-600">gm</span>
            </div>

            <button
              type="submit"
              disabled={initialPromptSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded text-sm font-medium transition"
            >
              {initialPromptSubmitting ? "Setting..." : "Set Initial Balance"}
            </button>
          </form>

          {parseFloat(initialBalance) < (data.header.lowStockThreshold || 10) && (
            <div className="mt-3 bg-red-100 border border-red-300 text-red-800 px-3 py-2 rounded text-xs font-medium">
              Opening balance is below the minimum threshold of {data.header.lowStockThreshold || 10} gm.
            </div>
          )}
        </div>
      )}

      {/* Media Preparation Table */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Name of Media</th>
                <th className="px-4 py-3 text-right">Opening (gm)</th>
                <th className="px-4 py-3 text-right">Qty Used (gm)</th>
                <th className="px-4 py-3 text-right">Balance (gm)</th>
                <th className="px-4 py-3 text-center">Tube/Plates</th>
                <th className="px-4 py-3">Used In</th>
                <th className="px-4 py-3">Prepared By</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                    Loading records...
                  </td>
                </tr>
              ) : !data || data.rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                    No media records found for this date.
                  </td>
                </tr>
              ) : (
                data.rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-xs font-medium text-gray-600">{row.date}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {row.mediaName}
                      {row.isConditional && (
                        <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-blue-50 text-blue-700 border border-blue-200">
                          Conditional (W &gt; 0)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{formatGrams(row.openingBalanceGm)}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      {formatGrams(row.quantityUsedGm)}
                      {row.flags.overridden && (
                        <span className="ml-1 text-xs text-blue-600 font-sans" title="Quantity overridden">*</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">{formatGrams(row.balanceGm)}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="font-semibold">{row.tubePlates}</div>
                      <div className="text-[11px] text-gray-400 font-mono" title={row.formulaText}>
                        {row.formulaText}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-xs truncate" title={row.usedIn.join(", ")}>
                      {row.usedIn.length > 0 ? row.usedIn.join(", ") : "-"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{row.preparedBy || "-"}</td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">{getStatusBadge(row.status)}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap space-x-2">
                      {row.flags.refillRequired ? (
                        <button
                          onClick={() => {
                            setRefillRow(row);
                            const required = row.quantityUsedGm || 0;
                            setRefillBalanceVal(String(required * 2));
                          }}
                          className="text-xs bg-red-600 hover:bg-red-700 text-white font-medium px-2 py-1 rounded"
                        >
                          Refill
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditRow(row);
                              setEditBalanceVal(String(row.openingBalanceGm || 0));
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              setOverrideRow(row);
                              setOverrideQtyVal(String(row.quantityUsedGm || 0));
                            }}
                            className="text-xs text-gray-500 hover:text-gray-800 font-medium"
                          >
                            Override
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Opening Balance Modal */}
      {editRow && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Edit Opening Balance</h3>
            <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded border border-amber-200">
              Warning: Changing opening balance will recalculate subsequent dates for {editRow.mediaName}.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500">Media</label>
                <div className="text-sm font-semibold">{editRow.mediaName}</div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500">Date</label>
                <div className="text-sm">{editRow.date}</div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500">Current Opening Balance (gm)</label>
                <div className="text-sm font-mono">{formatGrams(editRow.openingBalanceGm)}</div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">New Opening Balance (gm) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={editBalanceVal}
                  onChange={(e) => setEditBalanceVal(e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Reason for Change *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Weighing correction / Physical audit"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                onClick={() => setEditRow(null)}
                className="px-4 py-2 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                disabled={!editReason.trim()}
                onClick={handleEditBalance}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium disabled:opacity-50"
              >
                Save & Recalculate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refill Modal */}
      {refillRow && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Submit Stock Refill</h3>
            <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded text-xs space-y-1">
              <div><strong>Opening:</strong> {formatGrams(refillRow.openingBalanceGm)} gm</div>
              <div><strong>Required:</strong> {formatGrams(refillRow.quantityUsedGm)} gm</div>
              <div>
                <strong>Shortfall:</strong>{" "}
                {formatGrams((refillRow.quantityUsedGm || 0) - (refillRow.openingBalanceGm || 0))} gm
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700">New Opening Balance (gm) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={refillBalanceVal}
                  onChange={(e) => setRefillBalanceVal(e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Reason / Batch Refill Ref *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Added fresh bottle Lot #492"
                  value={refillReason}
                  onChange={(e) => setRefillReason(e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                onClick={() => setRefillRow(null)}
                className="px-4 py-2 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                disabled={!refillReason.trim()}
                onClick={handleRefill}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium disabled:opacity-50"
              >
                Submit Refill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Override Quantity Modal */}
      {overrideRow && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Override Quantity Used</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500">Media</label>
                <div className="text-sm font-semibold">{overrideRow.mediaName}</div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Quantity Used (gm) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={overrideQtyVal}
                  onChange={(e) => setOverrideQtyVal(e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Reason for Override *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Prepared extra tubes for re-test"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                onClick={() => setOverrideRow(null)}
                className="px-4 py-2 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                disabled={!overrideReason.trim()}
                onClick={handleOverride}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium disabled:opacity-50"
              >
                Apply Override
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
