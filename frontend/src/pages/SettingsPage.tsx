/**
 * frontend/src/pages/SettingsPage.tsx
 *
 * Settings Configuration Page:
 * - Media Master: Quantity per tube per media (with notice that blank = CALCULATION_BLOCKED)
 * - Low Stock Threshold (gm)
 * - Positive and Negative Control values
 * - Formula expressions (read-only by default, editable by admin)
 */

import React, { useState, useEffect } from "react";
import { apiFetch } from "../lib/api";
import { MediaMasterItem, MediaFormulaItem } from "../types";

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"media" | "formulas" | "controls">("media");

  // Media Master state
  const [mediaList, setMediaList] = useState<MediaMasterItem[]>([]);
  const [editingMediaId, setEditingMediaId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState<string>("");

  // Threshold & Controls state
  const [threshold, setThreshold] = useState<number>(10);
  const [posControl, setPosControl] = useState<number>(1);
  const [negControl, setNegControl] = useState<number>(1);

  // Formulas state
  const [formulas, setFormulas] = useState<MediaFormulaItem[]>([]);
  const [editingFormulaId, setEditingFormulaId] = useState<string | null>(null);
  const [editFormulaExpr, setEditFormulaExpr] = useState<string>("");

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [mediaRes, formulasRes, controlsRes, threshRes] = await Promise.all([
        apiFetch<MediaMasterItem[]>("/api/v1/settings/media"),
        apiFetch<MediaFormulaItem[]>("/api/v1/settings/formulas"),
        apiFetch<any>("/api/v1/settings/controls"),
        apiFetch<any>("/api/v1/settings/thresholds"),
      ]);

      setMediaList(mediaRes);
      setFormulas(formulasRes);
      setPosControl(controlsRes.positiveControl ?? 1);
      setNegControl(controlsRes.negativeControl ?? 1);
      setThreshold(threshRes.low_stock_threshold_gm ?? 10);
    } catch (err: any) {
      setError(err.message || "Failed to load settings.");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Save Media Quantity per Tube
  const handleSaveMediaQty = async (id: string) => {
    setMessage(null);
    setError(null);
    try {
      const val = editQty.trim() === "" ? null : parseFloat(editQty);
      await apiFetch(`/api/v1/settings/media/${id}`, {
        method: "PUT",
        body: JSON.stringify({ quantity_per_tube: val }),
      });
      setEditingMediaId(null);
      setMessage("Media master updated successfully.");
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Save Controls & Threshold
  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    try {
      await Promise.all([
        apiFetch("/api/v1/settings/controls", {
          method: "PUT",
          body: JSON.stringify({ positive_control: posControl, negative_control: negControl }),
        }),
        apiFetch("/api/v1/settings/thresholds", {
          method: "PUT",
          body: JSON.stringify({ low_stock_threshold_gm: threshold }),
        }),
      ]);
      setMessage("General controls and threshold updated successfully.");
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Save Formula
  const handleSaveFormula = async (id: string) => {
    setMessage(null);
    setError(null);
    try {
      await apiFetch(`/api/v1/settings/formulas/${id}`, {
        method: "PUT",
        body: JSON.stringify({ expression_text: editFormulaExpr }),
      });
      setEditingFormulaId(null);
      setMessage("Formula updated and verified successfully.");
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Laboratory Settings</h1>
        <p className="text-sm text-gray-500">Configure media quantities, formulas, controls, and thresholds.</p>
      </div>

      {message && <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded text-sm">{message}</div>}
      {error && <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded text-sm">{error}</div>}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 space-x-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab("media")}
          className={`pb-3 ${activeTab === "media" ? "border-b-2 border-blue-600 text-blue-600 font-semibold" : "text-gray-500 hover:text-gray-700"}`}
        >
          Media Master (Quantity/Tube)
        </button>
        <button
          onClick={() => setActiveTab("formulas")}
          className={`pb-3 ${activeTab === "formulas" ? "border-b-2 border-blue-600 text-blue-600 font-semibold" : "text-gray-500 hover:text-gray-700"}`}
        >
          Media Formulas
        </button>
        <button
          onClick={() => setActiveTab("controls")}
          className={`pb-3 ${activeTab === "controls" ? "border-b-2 border-blue-600 text-blue-600 font-semibold" : "text-gray-500 hover:text-gray-700"}`}
        >
          Controls & Thresholds
        </button>
      </div>

      {/* Tab 1: Media Master */}
      {activeTab === "media" && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden space-y-4 p-5">
          <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded text-xs">
            Note: Leaving <strong>Quantity per Tube</strong> blank indicates that the media value has not yet been established.
            Calculations for that media will be flagged as <code>CALCULATION_BLOCKED</code>.
          </div>

          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Media Name</th>
                <th className="px-4 py-3">Formula Key</th>
                <th className="px-4 py-3 text-right">Quantity / Tube (gm)</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-gray-800">
              {mediaList.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{m.displayOrder}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{m.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{m.formulaKey || "-"}</td>
                  <td className="px-4 py-3 text-right font-mono">
                    {editingMediaId === m.id ? (
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Leave empty for blank"
                        value={editQty}
                        onChange={(e) => setEditQty(e.target.value)}
                        className="w-28 border border-gray-300 rounded px-2 py-1 text-right text-sm"
                      />
                    ) : m.quantityPerTube !== null ? (
                      `${Number(m.quantityPerTube).toFixed(2)} ${m.unit}`
                    ) : (
                      <span className="text-red-500 text-xs italic">Unconfigured (Blocks)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editingMediaId === m.id ? (
                      <div className="space-x-2">
                        <button
                          onClick={() => handleSaveMediaQty(m.id)}
                          className="text-xs bg-blue-600 text-white px-2 py-1 rounded"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingMediaId(null)}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingMediaId(m.id);
                          setEditQty(m.quantityPerTube !== null ? String(m.quantityPerTube) : "");
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Media Formulas */}
      {activeTab === "formulas" && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden p-5 space-y-4">
          <p className="text-xs text-gray-500">
            Formulas are evaluated exactly as written without simplification. Allowed variables: <code>S</code>, <code>W</code>, <code>N</code>.
          </p>

          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Formula Key</th>
                <th className="px-4 py-3">Label</th>
                <th className="px-4 py-3 font-mono">Expression Text</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-gray-800">
              {formulas.map((f) => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-700">{f.formulaKey}</td>
                  <td className="px-4 py-3 text-gray-900">{f.label}</td>
                  <td className="px-4 py-3 font-mono text-sm">
                    {editingFormulaId === f.id ? (
                      <input
                        type="text"
                        value={editFormulaExpr}
                        onChange={(e) => setEditFormulaExpr(e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1 font-mono text-sm"
                      />
                    ) : (
                      f.expressionText
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editingFormulaId === f.id ? (
                      <div className="space-x-2">
                        <button
                          onClick={() => handleSaveFormula(f.id)}
                          className="text-xs bg-blue-600 text-white px-2 py-1 rounded"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingFormulaId(null)}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingFormulaId(f.id);
                          setEditFormulaExpr(f.expressionText);
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Controls & Thresholds */}
      {activeTab === "controls" && (
        <form onSubmit={handleSaveGeneral} className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 max-w-xl space-y-5">
          <div>
            <label className="block text-xs font-medium text-gray-700 uppercase">
              Low Stock Threshold (gm)
            </label>
            <p className="text-xs text-gray-500 mt-0.5">Media stock balances below this value produce a LOW_STOCK warning.</p>
            <input
              type="number"
              step="0.1"
              min="0.1"
              required
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="mt-2 w-32 border border-gray-300 rounded px-3 py-1.5 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-3 border-t">
            <div>
              <label className="block text-xs font-medium text-gray-700 uppercase">
                Positive Control (PC)
              </label>
              <input
                type="number"
                min="0"
                required
                value={posControl}
                onChange={(e) => setPosControl(parseInt(e.target.value, 10))}
                className="mt-2 w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 uppercase">
                Negative Control (NC)
              </label>
              <input
                type="number"
                min="0"
                required
                value={negControl}
                onChange={(e) => setNegControl(parseInt(e.target.value, 10))}
                className="mt-2 w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
              />
            </div>
          </div>

          <div className="pt-4 border-t flex justify-end">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition"
            >
              Save Controls & Threshold
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
