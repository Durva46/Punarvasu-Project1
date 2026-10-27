/**
 * frontend/src/pages/AlertsPage.tsx
 *
 * Laboratory Alerts Management Page.
 * Displays all alerts including LOW_STOCK, REFILL_REQUIRED, MISSING_QUANTITY_PER_TUBE,
 * AUTOCLAVE_VALIDATION with filters and resolution actions.
 */

import React, { useState, useEffect } from "react";
import { apiFetch } from "../lib/api";
import { formatDate } from "../lib/format";
import { AlertItem } from "../types";

export const AlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterResolved, setFilterResolved] = useState<string>("false");

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      let query = `?resolved=${filterResolved}`;
      if (filterType !== "ALL") query += `&alert_type=${filterType}`;
      const data = await apiFetch<AlertItem[]>(`/api/v1/alerts${query}`);
      setAlerts(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [filterType, filterResolved]);

  const handleResolve = async (id: string) => {
    try {
      await apiFetch(`/api/v1/alerts/${id}/resolve`, { method: "PATCH" });
      await fetchAlerts();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laboratory Alerts & Warnings</h1>
          <p className="text-sm text-gray-500">Traceability flags, low stock notices, and calculation blockers.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white"
          >
            <option value="ALL">All Alert Types</option>
            <option value="LOW_STOCK">LOW_STOCK</option>
            <option value="REFILL_REQUIRED">REFILL_REQUIRED</option>
            <option value="MISSING_QUANTITY_PER_TUBE">MISSING_QUANTITY_PER_TUBE</option>
            <option value="MISSING_OPENING_BALANCE">MISSING_OPENING_BALANCE</option>
            <option value="AUTOCLAVE_VALIDATION">AUTOCLAVE_VALIDATION</option>
          </select>

          <select
            value={filterResolved}
            onChange={(e) => setFilterResolved(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white"
          >
            <option value="false">Unresolved Only</option>
            <option value="true">Resolved Only</option>
          </select>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-semibold">
            <tr>
              <th className="px-4 py-3">Severity</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Message</th>
              <th className="px-4 py-3">Created At</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  Loading alerts...
                </td>
              </tr>
            ) : alerts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No alerts match your filter criteria.
                </td>
              </tr>
            ) : (
              alerts.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        a.severity === "ERROR"
                          ? "bg-red-100 text-red-800"
                          : a.severity === "WARNING"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {a.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{a.alertType}</td>
                  <td className="px-4 py-3 text-gray-900 font-medium">{a.message}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{formatDate(a.createdAt)}</td>
                  <td className="px-4 py-3">
                    {a.resolved ? (
                      <span className="text-xs text-green-700 font-medium">
                        Resolved {a.resolvedBy ? `by ${a.resolvedBy}` : ""}
                      </span>
                    ) : (
                      <span className="text-xs text-amber-600 font-medium">Pending</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!a.resolved && (
                      <button
                        onClick={() => handleResolve(a.id)}
                        className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium px-2 py-1 rounded"
                      >
                        Resolve
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
