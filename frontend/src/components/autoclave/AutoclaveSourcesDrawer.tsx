/**
 * frontend/src/components/autoclave/AutoclaveSourcesDrawer.tsx
 *
 * Read-only traceability drawer listing samples and media records linked to a cycle.
 */

import React, { useState, useEffect } from "react";
import { AutoclaveEntry } from "../../types";
import { apiFetch } from "../../lib/api";

interface Props {
  entry: AutoclaveEntry | null;
  onClose: () => void;
}

export const AutoclaveSourcesDrawer: React.FC<Props> = ({ entry, onClose }) => {
  if (!entry) return null;

  const [loading, setLoading] = useState<boolean>(true);
  const [samples, setSamples] = useState<any[]>([]);

  useEffect(() => {
    setLoading(true);
    // Convert DD-MM-YYYY to YYYY-MM-DD
    const parts = entry.logDate.split("-");
    const isoDate = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : entry.logDate;

    apiFetch<{ data: any[] }>(`/api/v1/imports/${entry.reportId}/samples?date=${isoDate}&page_size=200`)
      .then((res) => {
        setSamples(res.data || []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [entry]);

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-white shadow-2xl z-50 flex flex-col font-sans">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div>
            <h3 className="text-base font-bold text-gray-900">Cycle Load Traceability</h3>
            <p className="text-xs text-gray-500">
              {entry.loadDescription} ({entry.logDate})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg font-bold px-2 py-1"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 text-sm">
          <div>
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Registered Samples ({samples.length})
            </h4>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                <thead className="bg-gray-50 text-gray-600 font-semibold uppercase">
                  <tr>
                    <th className="px-3 py-2">AR No.</th>
                    <th className="px-3 py-2">Sample Name</th>
                    <th className="px-3 py-2">Batch No.</th>
                    <th className="px-3 py-2">Water</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-gray-800">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-center text-gray-400">Loading sources...</td>
                    </tr>
                  ) : samples.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-center text-gray-400">No samples found for this date.</td>
                    </tr>
                  ) : (
                    samples.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-mono font-medium">{s.sampleIdentifier}</td>
                        <td className="px-3 py-2">{s.sampleName || "-"}</td>
                        <td className="px-3 py-2 font-mono text-gray-500">{s.batchNumber || "-"}</td>
                        <td className="px-3 py-2">
                          {s.isWater ? (
                            <span className="text-[10px] font-bold text-blue-600 uppercase">Yes</span>
                          ) : (
                            <span className="text-gray-400">No</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 border border-gray-300 rounded text-xs font-semibold text-gray-700 hover:bg-white"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
};
