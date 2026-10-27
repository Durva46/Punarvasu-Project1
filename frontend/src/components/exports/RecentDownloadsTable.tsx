/**
 * frontend/src/components/exports/RecentDownloadsTable.tsx
 *
 * Recent downloads list loaded from export_log.
 */

import React from "react";
import { ExportDownloadLogItem } from "../../types";

interface RecentDownloadsTableProps {
  logs: ExportDownloadLogItem[];
  isLoading: boolean;
}

export const RecentDownloadsTable: React.FC<RecentDownloadsTableProps> = ({
  logs,
  isLoading,
}) => {
  return (
    <div className="bg-white rounded-xl border border-line shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-line bg-surface/30 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Recent Downloads Audit</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit history of generated files from export_log.
          </p>
        </div>
        <span className="text-xs font-medium text-slate-500">
          Showing last {logs.length} downloads
        </span>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-xs text-slate-400">Loading download history...</div>
      ) : logs.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-400">
          No exports recorded yet for this month.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-line text-slate-600 font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-4">Export Type</th>
                <th className="py-2.5 px-4">Format</th>
                <th className="py-2.5 px-4">Month</th>
                <th className="py-2.5 px-4">Exported By</th>
                <th className="py-2.5 px-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-slate-700">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-2.5 px-4 font-medium text-slate-900">{log.exportType}</td>
                  <td className="py-2.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.format === "PDF"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {log.format}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 font-mono">{log.reportingMonth}</td>
                  <td className="py-2.5 px-4">{log.exportedBy}</td>
                  <td className="py-2.5 px-4 text-right text-slate-500 font-mono">
                    {log.createdAt}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
