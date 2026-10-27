/**
 * frontend/src/components/autoclave/AutoclaveHistoryDrawer.tsx
 *
 * Audit trail timeline for an autoclave log entry.
 */

import React, { useState, useEffect } from "react";
import { AutoclaveEntry, AuditHistoryItem } from "../../types";
import { formatDate } from "../../lib/format";
import { apiFetch } from "../../lib/api";

interface Props {
  entry?: AutoclaveEntry | null;
  entryTitle?: string;
  history?: AuditHistoryItem[];
  isLoading?: boolean;
  isOpen?: boolean;
  onClose: () => void;
}

export const AutoclaveHistoryDrawer: React.FC<Props> = ({
  entry,
  entryTitle,
  history: providedHistory,
  isLoading: providedLoading,
  isOpen,
  onClose,
}) => {
  if (isOpen === false) return null;
  if (!entry && !entryTitle) return null;

  const [loading, setLoading] = useState<boolean>(true);
  const [history, setHistory] = useState<AuditHistoryItem[]>([]);

  useEffect(() => {
    if (providedHistory !== undefined) {
      setHistory(providedHistory);
      setLoading(Boolean(providedLoading));
      return;
    }
    if (entry?.id) {
      setLoading(true);
      apiFetch<AuditHistoryItem[]>(`/api/v1/autoclave/entries/${entry.id}/history`)
        .then((data) => setHistory(data))
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [entry, providedHistory, providedLoading]);

  const title = entryTitle || (entry ? `${entry.loadDescription} (${entry.logDate})` : "History");

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col font-sans">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div>
            <h3 className="text-base font-bold text-gray-900">Audit Trail History</h3>
            <p className="text-xs text-gray-500">{title}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg font-bold px-2 py-1"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 text-sm">
          {loading ? (
            <p className="text-gray-400 text-xs text-center py-8">Loading audit timeline...</p>
          ) : history.length === 0 ? (
            <p className="text-gray-400 text-xs text-center py-8">No audit modifications recorded.</p>
          ) : (
            <div className="space-y-4">
              {history.map((h) => (
                <div key={h.id} className="border-l-2 border-blue-600 pl-4 py-1 text-xs space-y-1">
                  <div className="flex items-center justify-between text-gray-500">
                    <span className="font-semibold text-gray-800">{h.action}</span>
                    <span>{formatDate(h.changedAt)}</span>
                  </div>
                  <div className="text-gray-700">
                    <strong>By:</strong> {h.changedBy}
                  </div>
                  {h.field && (
                    <div className="font-mono text-gray-600">
                      <strong>Field:</strong> {h.field}
                    </div>
                  )}
                  {h.oldValue && (
                    <div className="text-gray-500">
                      <strong>Old:</strong> {h.oldValue}
                    </div>
                  )}
                  {h.newValue && (
                    <div className="text-gray-800 font-medium">
                      <strong>New:</strong> {h.newValue}
                    </div>
                  )}
                  {h.reason && (
                    <div className="text-amber-800 bg-amber-50 p-1.5 rounded mt-1 border border-amber-200">
                      <strong>Reason:</strong> {h.reason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
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
