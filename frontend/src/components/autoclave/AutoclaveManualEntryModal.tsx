/**
 * frontend/src/components/autoclave/AutoclaveManualEntryModal.tsx
 *
 * Modal to add an extra load cycle (Glassware, Plasticware, Apron, etc.).
 */

import React, { useState, useEffect } from "react";
import { LoadTypeItem } from "../../types";
import { apiFetch } from "../../lib/api";

interface Props {
  reportId: string;
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export const AutoclaveManualEntryModal: React.FC<Props> = ({
  reportId,
  isOpen,
  onClose,
  onCreated,
}) => {
  if (!isOpen) return null;

  const [loadTypes, setLoadTypes] = useState<LoadTypeItem[]>([]);
  const [selectedLoadTypeId, setSelectedLoadTypeId] = useState<string>("");
  const [logDate, setLogDate] = useState<string>("");
  const [description, setDescription] = useState<string>(
    "Media, Glassware - Plates, Plasticware- Tips, Spatulas and Apron"
  );

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<LoadTypeItem[]>("/api/v1/autoclave/load-types")
      .then((data) => {
        setLoadTypes(data);
        if (data.length > 0) {
          // Default to first non-media load type if available
          const nonMedia = data.find((l) => l.name !== "Media");
          setSelectedLoadTypeId(nonMedia ? nonMedia.id : data[0].id);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch("/api/v1/autoclave/entries", {
        method: "POST",
        body: JSON.stringify({
          report_id: reportId,
          load_type_id: selectedLoadTypeId,
          log_date: logDate,
          load_description: description.trim(),
        }),
      });
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create manual entry.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="border-b pb-3">
          <h3 className="text-base font-bold text-gray-900">Add Extra Load Entry</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Manual cycle entry (e.g. Glassware, Plasticware, Apron). Defaults populated from active settings.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-gray-700">Load Type *</label>
            <select
              required
              value={selectedLoadTypeId}
              onChange={(e) => setSelectedLoadTypeId(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded px-3 py-1.5 text-sm bg-white"
            >
              {loadTypes.map((lt) => (
                <option key={lt.id} value={lt.id}>
                  {lt.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700">Log Date *</label>
            <input
              type="date"
              required
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700">Load Description *</label>
            <input
              type="text"
              required
              placeholder="e.g. Glassware — Conical Flasks & Beakers"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
              disabled={submitting || !description.trim() || !logDate}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-semibold disabled:opacity-50"
            >
              {submitting ? "Adding..." : "Add Entry"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
