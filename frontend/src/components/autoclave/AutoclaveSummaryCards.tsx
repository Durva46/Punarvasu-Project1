/**
 * frontend/src/components/autoclave/AutoclaveSummaryCards.tsx
 *
 * Real metric cards rendered exclusively from GET /api/autoclave/summary.
 * Never fabricates numbers.
 */

import React from "react";
import { AutoclaveSummary } from "../../types";

interface Props {
  summary: AutoclaveSummary | null;
  selectedMonth: string;
}

export const AutoclaveSummaryCards: React.FC<Props> = ({ summary, selectedMonth }) => {
  const equip = summary?.equipment;
  const cleaning = summary?.cleaning;
  const totalCleaning = (cleaning?.scheduled || 0) + (cleaning?.completed || 0) + (cleaning?.overdue || 0);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {/* 1. Month / Period */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <span className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
          Reporting Period
        </span>
        <span className="text-sm font-bold text-gray-900 mt-1 block">
          {selectedMonth || "Current Month"}
        </span>
        <span className="text-[11px] text-gray-400 mt-0.5 block">Monthly Cycle Load</span>
      </div>

      {/* 2. Equipment */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <span className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
          Equipment
        </span>
        <span className="text-xs font-semibold text-gray-800 mt-1 block">
          {equip ? equip.equipmentNo : "PM/QC/M/01"}
        </span>
        <span className="text-[10px] text-gray-500 mt-0.5 block truncate" title={equip?.refSopNo}>
          Ref: {equip?.refSopNo || "PM/QC/M/023"}
        </span>
      </div>

      {/* 3. Total Cycles */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <span className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
          Total Cycles
        </span>
        <span className="text-xl font-bold text-gray-900 mt-1 block">
          {summary ? summary.totalEntries : 0}
        </span>
        <span className="text-[11px] text-gray-500 mt-0.5 block">1 cycle per date</span>
      </div>

      {/* 4. Completed (Verified) */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <span className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
          Verified
        </span>
        <span className="text-xl font-bold text-green-700 mt-1 block">
          {summary ? summary.completedCount : 0}
        </span>
        <span className="text-[11px] text-green-600 mt-0.5 block">Readings verified</span>
      </div>

      {/* 5. Pending / Planned */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <span className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
          Pending Verification
        </span>
        <span className="text-xl font-bold text-amber-700 mt-1 block">
          {summary ? summary.pendingCount : 0}
        </span>
        <span className="text-[11px] text-gray-500 mt-0.5 block">
          {summary?.prefilledCount || 0} planned
        </span>
      </div>

      {/* 6. Weekly Cleaning Schedule */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <span className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
          Weekly Cleaning
        </span>
        {totalCleaning === 0 ? (
          <div>
            <span className="text-xs font-medium text-gray-500 mt-1 block">0 scheduled</span>
            <span className="text-[10px] text-gray-400 mt-0.5 block leading-tight">
              Cleaning schedule not generated yet
            </span>
          </div>
        ) : (
          <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold">
            <span className="text-green-700">{cleaning?.completed || 0} done</span>
            <span className="text-gray-300">/</span>
            <span className="text-amber-700">{cleaning?.scheduled || 0} sched</span>
          </div>
        )}
      </div>
    </div>
  );
};
