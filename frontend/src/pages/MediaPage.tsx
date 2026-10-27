/**
 * frontend/src/pages/MediaPage.tsx
 *
 * Media Preparation Page (Step 1).
 * Adheres strictly to Laboratory Formulation Engine:
 *
 * Variables:
 *  - S = Total samples registered on date
 *  - W = Samples containing "water" in name
 *  - N = S - W (Samples without "water" in name)
 *  - Positive Control = 1
 *  - Negative Control = 1
 *
 * Tube/Plate Calculations:
 *  a) Soybean Casein Digest Broth: Tubes/Plates = S * 2
 *  b) Mac Conkey's Broth: Tubes/Plates = (S + 1 + 1 + 1) * 2  (extra 1s for Positive and Negative control)
 *  c) Peptone Water to Urea Broth: Tubes/Plates = S + 1 + 1
 *  d) Conditional R2A Agar (added ONLY when W > 0): Tubes/Plates = W * 2
 *  e) Soybean Casein Digest Agar & Sabouraud Dextrose Agar: Tubes/Plates = (N * 2) + 1 + 1
 *
 * Opening Balance & Quantity Used:
 *  - User is prompted once for Opening Balance (red flag if < 10 gm).
 *  - Opening Balance is auto-filled across all media rows.
 *  - User enters Quantity Used (gm) for each media.
 *  - Balance is calculated: Balance = Opening Balance - Quantity Used.
 *  - Default prepared by = authenticated user; authorized selection of staff supported.
 */

import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { formatGrams } from "../lib/format";

interface MediaMasterDef {
  id: string;
  name: string;
  category: "scdb" | "mac_conkey" | "standard" | "r2a" | "agar_non_water";
  formulaDisplay: string;
  defaultQtyUsed?: number;
}

const BASE_MEDIA_LIST: MediaMasterDef[] = [
  { id: "m-scdb", name: "Soybean Casein Digest Broth", category: "scdb", formulaDisplay: "S × 2" },
  { id: "m-mcb", name: "Mac Conkey's Broth", category: "mac_conkey", formulaDisplay: "(S + 1 + 1 + 1) × 2" },
  { id: "m-pw", name: "Peptone Water", category: "standard", formulaDisplay: "S + 1 + 1" },
  { id: "m-mca", name: "Mac Conkey's Agar", category: "standard", formulaDisplay: "S + 1 + 1" },
  { id: "m-emba", name: "Eosine Methelene Blue Agar", category: "standard", formulaDisplay: "S + 1 + 1" },
  { id: "m-msa", name: "Mannitol Salt Agar", category: "standard", formulaDisplay: "S + 1 + 1" },
  { id: "m-vja", name: "Vogel Johnson Agar", category: "standard", formulaDisplay: "S + 1 + 1" },
  { id: "m-bpa", name: "Baird Parker Agar", category: "standard", formulaDisplay: "S + 1 + 1" },
  { id: "m-ca", name: "Cetrimide Agar", category: "standard", formulaDisplay: "S + 1 + 1" },
  { id: "m-pa", name: "Pseudomonas Agar", category: "standard", formulaDisplay: "S + 1 + 1" },
  { id: "m-sfb", name: "Selenite F Broth (Part A+B)", category: "standard", formulaDisplay: "S + 1 + 1" },
  { id: "m-tb", name: "Tetrathionate Broth", category: "standard", formulaDisplay: "S + 1 + 1" },
  { id: "m-xlda", name: "Xylose Lysine Deoxycholate Agar", category: "standard", formulaDisplay: "S + 1 + 1" },
  { id: "m-bsa", name: "Bishmuth Sulphite Agar", category: "standard", formulaDisplay: "S + 1 + 1" },
  { id: "m-bga", name: "Brilliant Green Agar", category: "standard", formulaDisplay: "S + 1 + 1" },
  { id: "m-dca", name: "Deoxycholate Citrate Agar", category: "standard", formulaDisplay: "S + 1 + 1" },
  { id: "m-tsia", name: "Triple Sugar Iron Agar", category: "standard", formulaDisplay: "S + 1 + 1" },
  { id: "m-ub", name: "Urea Broth", category: "standard", formulaDisplay: "S + 1 + 1" },
  // Conditional R2A Agar inserted dynamically if W > 0
  { id: "m-scda", name: "Soybean Casein Digest Agar", category: "agar_non_water", formulaDisplay: "(N × 2) + 1 + 1" },
  { id: "m-sda", name: "Sabouraud Dextrose Agar", category: "agar_non_water", formulaDisplay: "(N × 2) + 1 + 1" },
];

const R2A_MEDIA_DEF: MediaMasterDef = {
  id: "m-r2a",
  name: "R2A Agar (Water Specific)",
  category: "r2a",
  formulaDisplay: "W × 2",
};

interface PreparedMediaRow {
  id: string;
  name: string;
  formulaDisplay: string;
  tubesPlates: number;
  openingBalanceGm: number;
  quantityUsedGm: number;
  balanceGm: number;
  preparedBy: string;
  isConditional?: boolean;
}

interface StoredDayAnalysis {
  date: string; // ISO
  displayDate: string; // DD-MM-YYYY
  total: number; // S
  water: number; // W
  nonWater: number; // N
  sampleNames: string[];
}

export const MediaPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Selected date & data from uploaded excel
  const [availableDays, setAvailableDays] = useState<StoredDayAnalysis[]>([]);
  const [selectedDateIso, setSelectedDateIso] = useState<string>("");

  // Opening balance prompt
  const [openingBalanceInput, setOpeningBalanceInput] = useState<string>("500");
  const [, setOpeningBalanceApplied] = useState<boolean>(false);
  const [isLowStockAlert, setIsLowStockAlert] = useState<boolean>(false);

  // Table rows per selected date
  const [mediaRows, setMediaRows] = useState<PreparedMediaRow[]>([]);

  // Staff options
  const defaultStaff = user?.fullName || "Lab Analyst";
  const [selectedStaff, setSelectedStaff] = useState<string>(defaultStaff);
  const staffList = ["Lab Analyst", "QC Chemist", "Microbiologist", "Lab Supervisor", defaultStaff].filter(
    (v, i, a) => a.indexOf(v) === i
  );

  // Save notification
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // 1. Load days from Excel analysis stored in localStorage
  useEffect(() => {
    const cachedDaily = localStorage.getItem("labflow_analyzed_daily");
    if (cachedDaily) {
      try {
        const days: StoredDayAnalysis[] = JSON.parse(cachedDaily);
        setAvailableDays(days);
        if (days.length > 0) {
          const preselected = localStorage.getItem("labflow_selected_date");
          const found = days.find((d) => d.date === preselected || d.displayDate === preselected);
          setSelectedDateIso(found ? found.date : days[0].date);
        }
      } catch (err) {
        console.error("Failed to load cached daily analysis", err);
      }
    } else {
      // Default demo test day if no excel uploaded yet
      const fallback: StoredDayAnalysis = {
        date: new Date().toISOString().slice(0, 10),
        displayDate: "27-10-2026",
        total: 4,
        water: 1,
        nonWater: 3,
        sampleNames: ["Water for Injection", "Purified Water Raw", "Syrup Base", "Herbal Extract"],
      };
      setAvailableDays([fallback]);
      setSelectedDateIso(fallback.date);
    }
  }, []);

  // Current active day counts
  const currentDay = availableDays.find((d) => d.date === selectedDateIso) || availableDays[0];
  const S = currentDay?.total || 0;
  const W = currentDay?.water || 0;
  const N = currentDay?.nonWater || Math.max(0, S - W);
  const positiveControl = 1;
  const negativeControl = 1;

  // 2. Build rows whenever date or day counts change
  useEffect(() => {
    if (!currentDay) return;

    // Check if user already customized this day in localStorage
    const storageKey = `labflow_media_prep_${currentDay.date}`;
    const cachedRows = localStorage.getItem(storageKey);
    const cachedOpening = localStorage.getItem(`labflow_media_opening_${currentDay.date}`);

    if (cachedOpening) {
      setOpeningBalanceInput(cachedOpening);
      setOpeningBalanceApplied(true);
      setIsLowStockAlert(parseFloat(cachedOpening) < 10);
    }

    // Determine list of media: insert R2A only if W > 0
    const mediaList: MediaMasterDef[] = [];
    BASE_MEDIA_LIST.forEach((m) => {
      if (m.id === "m-scda" && W > 0) {
        mediaList.push(R2A_MEDIA_DEF);
      }
      mediaList.push(m);
    });

    const initialOpening = parseFloat(openingBalanceInput) || 500;

    let parsedCustom: Record<string, { qtyUsed?: number; opening?: number; staff?: string }> = {};
    if (cachedRows) {
      try {
        parsedCustom = JSON.parse(cachedRows);
      } catch {}
    }

    const rows: PreparedMediaRow[] = mediaList.map((m) => {
      // Tube/Plate calculation according to exact rules:
      let tubes = 0;
      switch (m.category) {
        case "scdb":
          // a) Soybean Casein Digest Broth: Tubes/Plates = S * 2
          tubes = S * 2;
          break;
        case "mac_conkey":
          // b) Mac Conkey's Broth: Tubes/Plates = (S + 1 + 1 + 1) * 2
          tubes = (S + 1 + positiveControl + negativeControl) * 2;
          break;
        case "standard":
          // c) Peptone Water to Urea Broth: Tubes/Plates = S + 1 + 1
          tubes = S + positiveControl + negativeControl;
          break;
        case "r2a":
          // d) R2A Agar: Tubes/Plates = W * 2
          tubes = W * 2;
          break;
        case "agar_non_water":
          // e) SCDA & SDA: Tubes/Plates = (N * 2) + 1 + 1
          tubes = N * 2 + positiveControl + negativeControl;
          break;
      }

      const custom = parsedCustom[m.id];
      const opening = custom?.opening !== undefined ? custom.opening : initialOpening;
      const qtyUsed = custom?.qtyUsed !== undefined ? custom.qtyUsed : 0;
      const balance = Math.max(0, opening - qtyUsed);
      const rowStaff = custom?.staff || selectedStaff;

      return {
        id: m.id,
        name: m.name,
        formulaDisplay: m.formulaDisplay,
        tubesPlates: tubes,
        openingBalanceGm: opening,
        quantityUsedGm: qtyUsed,
        balanceGm: balance,
        preparedBy: rowStaff,
        isConditional: m.category === "r2a",
      };
    });

    setMediaRows(rows);
  }, [currentDay, selectedDateIso]);

  // Handle setting/autofilling opening balance across all media rows
  const handleApplyOpeningBalance = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(openingBalanceInput);
    if (isNaN(val)) return;

    setIsLowStockAlert(val < 10);
    setOpeningBalanceApplied(true);

    // Auto-fill across all rows and update balances
    setMediaRows((prev) =>
      prev.map((r) => {
        const bal = Math.max(0, val - r.quantityUsedGm);
        return {
          ...r,
          openingBalanceGm: val,
          balanceGm: bal,
        };
      })
    );

    if (currentDay) {
      localStorage.setItem(`labflow_media_opening_${currentDay.date}`, String(val));
    }
  };

  // Handle changing quantity used for any specific media
  const handleQuantityUsedChange = (rowId: string, valStr: string) => {
    const val = parseFloat(valStr) || 0;
    setMediaRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const newBalance = Math.max(0, r.openingBalanceGm - val);
        return {
          ...r,
          quantityUsedGm: val,
          balanceGm: newBalance,
        };
      })
    );
  };

  // Handle individual opening balance edit
  const handleRowOpeningChange = (rowId: string, valStr: string) => {
    const val = parseFloat(valStr) || 0;
    setMediaRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const newBalance = Math.max(0, val - r.quantityUsedGm);
        return {
          ...r,
          openingBalanceGm: val,
          balanceGm: newBalance,
        };
      })
    );
  };

  // Handle staff assignment change
  const handleStaffChange = (rowId: string, staffName: string) => {
    setMediaRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, preparedBy: staffName } : r))
    );
  };

  // Save current day preparation record
  const handleSavePreparation = () => {
    if (!currentDay) return;
    const storageKey = `labflow_media_prep_${currentDay.date}`;
    const payload: Record<string, { qtyUsed: number; opening: number; staff: string }> = {};

    mediaRows.forEach((r) => {
      payload[r.id] = {
        qtyUsed: r.quantityUsedGm,
        opening: r.openingBalanceGm,
        staff: r.preparedBy,
      };
    });

    localStorage.setItem(storageKey, JSON.stringify(payload));
    localStorage.setItem(`labflow_media_opening_${currentDay.date}`, openingBalanceInput);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Navigate to Autoclave Log Book (Step 2)
  const proceedToAutoclave = () => {
    handleSavePreparation();
    navigate("/autoclave");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 font-sans">
      {/* Workflow Navigation Banner */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            Step 1 of Laboratory Workflow
          </span>
          <h1 className="text-xl font-bold text-gray-900 mt-1">
            Media Preparation Record & Formulation Engine
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            PETLAD MAHAL AROGYA MANDAL PHARMACY — Form No: QC/M/023/F/01
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/imports"
            className="px-3 py-1.5 border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            &larr; View Excel Analysis
          </Link>
          <button
            onClick={proceedToAutoclave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold shadow-sm transition"
          >
            Proceed to Step 2: Autoclave &rarr;
          </button>
        </div>
      </div>

      {/* Date & Sample Breakdown Header Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">
              Selected Sample Date:
            </label>
            <select
              value={selectedDateIso}
              onChange={(e) => {
                setSelectedDateIso(e.target.value);
                localStorage.setItem("labflow_selected_date", e.target.value);
              }}
              className="text-xs font-bold border border-gray-300 rounded px-3 py-1.5 bg-white shadow-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
              {availableDays.map((d) => (
                <option key={d.date} value={d.date}>
                  {d.displayDate} ({d.total} samples)
                </option>
              ))}
            </select>
          </div>

          <div className="text-xs text-gray-500">
            Authenticated User: <span className="font-semibold text-gray-800">{defaultStaff}</span>
          </div>
        </div>

        {/* Counts Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-slate-50 border border-gray-200 p-3 rounded text-center">
            <span className="block text-[11px] font-semibold text-gray-500 uppercase">
              Total Samples ($S$)
            </span>
            <span className="text-xl font-bold text-blue-700">{S}</span>
          </div>
          <div className="bg-blue-50/50 border border-blue-200 p-3 rounded text-center">
            <span className="block text-[11px] font-semibold text-blue-700 uppercase">
              Water Samples ($W$)
            </span>
            <span className="text-xl font-bold text-blue-800">{W}</span>
            {W > 0 && <span className="block text-[10px] text-blue-600 mt-0.5">R2A Agar Added</span>}
          </div>
          <div className="bg-slate-50 border border-gray-200 p-3 rounded text-center">
            <span className="block text-[11px] font-semibold text-gray-500 uppercase">
              Non-Water ($N = S - W$)
            </span>
            <span className="text-xl font-bold text-gray-800">{N}</span>
          </div>
          <div className="bg-slate-50 border border-gray-200 p-3 rounded text-center">
            <span className="block text-[11px] font-semibold text-gray-500 uppercase">
              Positive Control ($PC$)
            </span>
            <span className="text-xl font-bold text-emerald-700">{positiveControl}</span>
          </div>
          <div className="bg-slate-50 border border-gray-200 p-3 rounded text-center">
            <span className="block text-[11px] font-semibold text-gray-500 uppercase">
              Negative Control ($NC$)
            </span>
            <span className="text-xl font-bold text-emerald-700">{negativeControl}</span>
          </div>
        </div>

        {/* Registered sample names for this day */}
        {currentDay && currentDay.sampleNames.length > 0 && (
          <div className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded border border-gray-200 flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-gray-700">Samples registered today:</span>
            {currentDay.sampleNames.map((name, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2 py-0.5 rounded bg-white border border-gray-300 text-gray-800 text-[11px]"
              >
                {name}
                {name.toLowerCase().includes("water") && (
                  <span className="ml-1 text-[9px] font-bold text-blue-600">(Water)</span>
                )}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Opening Balance Prompt & Auto-Fill Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-1">
          Opening Balance & Formulation Parameters
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          Enter the starting Opening Balance in grams (gm). Clicking <strong>"Apply & Auto-Fill Across All Media"</strong> will populate the Opening Balance column for every media row on this date.
        </p>

        <form onSubmit={handleApplyOpeningBalance} className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-700">Opening Balance:</label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={openingBalanceInput}
              onChange={(e) => {
                setOpeningBalanceInput(e.target.value);
                const val = parseFloat(e.target.value);
                setIsLowStockAlert(!isNaN(val) && val < 10);
              }}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm w-36 shadow-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              placeholder="e.g. 500"
            />
            <span className="text-xs font-semibold text-gray-600">gm</span>
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold shadow-xs transition"
          >
            Apply & Auto-Fill Across All Media
          </button>

          {/* Default Staff selector for accountability */}
          <div className="ml-auto flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-700">Prepared By (Staff):</label>
            <select
              value={selectedStaff}
              onChange={(e) => {
                const newStaff = e.target.value;
                setSelectedStaff(newStaff);
                setMediaRows((prev) => prev.map((r) => ({ ...r, preparedBy: newStaff })));
              }}
              className="text-xs border border-gray-300 rounded px-2.5 py-1.5 bg-white shadow-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
              {staffList.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </form>

        {/* Low Stock Alert Signal (Red Flag) if < 10 gm */}
        {isLowStockAlert && (
          <div className="mt-4 p-3 bg-red-50 border-l-4 border-red-600 text-red-800 rounded-r flex items-center gap-2">
            <span className="text-red-600 font-bold text-lg">🚩</span>
            <div>
              <span className="font-bold text-xs uppercase tracking-wide">
                Alert: Low Stock Warning!
              </span>
              <p className="text-xs text-red-700">
                Opening Balance is <strong>{openingBalanceInput || 0} gm</strong>, which is below the mandatory minimum threshold of <strong>10 gm</strong>. Refill recommended.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Media Preparation Table */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex flex-wrap justify-between items-center gap-2 bg-gray-50">
          <div>
            <h3 className="text-sm font-bold text-gray-800">
              Media Preparation Table — {currentDay?.displayDate}
            </h3>
            <p className="text-xs text-gray-500">
              Formula: Balance Quantity = Opening Balance − Quantity Used. Tube/Plates calculated per media formulation.
            </p>
          </div>
          <button
            onClick={handleSavePreparation}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold shadow-xs transition"
          >
            {savedSuccess ? "✓ Saved" : "Save Preparation Log"}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-xs">
            <thead className="bg-slate-50 text-gray-700 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3 text-left w-24">Date</th>
                <th className="px-4 py-3 text-left">Name of Media</th>
                <th className="px-4 py-3 text-center w-28">Formula Used</th>
                <th className="px-4 py-3 text-center w-24">Tube / Plates</th>
                <th className="px-4 py-3 text-right w-32">Opening (gm)</th>
                <th className="px-4 py-3 text-right w-36">Quantity Used (gm)</th>
                <th className="px-4 py-3 text-right w-32">Balance (gm)</th>
                <th className="px-4 py-3 text-left w-36">Prepared By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {mediaRows.map((row) => {
                const isShortfall = row.quantityUsedGm > row.openingBalanceGm;
                return (
                  <tr
                    key={row.id}
                    className={`hover:bg-blue-50/20 transition ${
                      row.isConditional ? "bg-blue-50/10" : ""
                    }`}
                  >
                    {/* Date */}
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                      {currentDay?.displayDate}
                    </td>

                    {/* Name of Media */}
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {row.name}
                      {row.isConditional && (
                        <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-blue-800 font-bold border border-blue-200">
                          Water Specific
                        </span>
                      )}
                    </td>

                    {/* Formula Description */}
                    <td className="px-4 py-3 text-center font-mono text-[11px] text-gray-500 whitespace-nowrap">
                      {row.formulaDisplay}
                    </td>

                    {/* Tubes / Plates Result */}
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center px-2.5 py-1 rounded bg-blue-100 text-blue-800 font-bold text-xs shadow-2xs">
                        {row.tubesPlates}
                      </span>
                    </td>

                    {/* Opening Balance (gm) */}
                    <td className="px-4 py-3 text-right">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={row.openingBalanceGm}
                        onChange={(e) => handleRowOpeningChange(row.id, e.target.value)}
                        className={`w-24 text-right px-2 py-1 border rounded text-xs font-mono font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none ${
                          row.openingBalanceGm < 10
                            ? "border-red-300 bg-red-50 text-red-700"
                            : "border-gray-300 bg-white"
                        }`}
                      />
                    </td>

                    {/* Quantity Used (gm) */}
                    <td className="px-4 py-3 text-right">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={row.quantityUsedGm === 0 ? "" : row.quantityUsedGm}
                        onChange={(e) => handleQuantityUsedChange(row.id, e.target.value)}
                        className={`w-28 text-right px-2 py-1 border rounded text-xs font-mono font-semibold focus:ring-1 focus:ring-blue-500 focus:outline-none ${
                          isShortfall
                            ? "border-red-500 bg-red-50 text-red-700"
                            : "border-gray-300 bg-white"
                        }`}
                      />
                    </td>

                    {/* Calculated Balance (gm) = Opening - Qty Used */}
                    <td className="px-4 py-3 text-right font-mono font-bold">
                      <span
                        className={
                          row.balanceGm < 10
                            ? "text-red-600"
                            : row.balanceGm < 50
                            ? "text-amber-600"
                            : "text-emerald-700"
                        }
                      >
                        {formatGrams(row.balanceGm)} gm
                      </span>
                    </td>

                    {/* Prepared By */}
                    <td className="px-4 py-3">
                      <select
                        value={row.preparedBy}
                        onChange={(e) => handleStaffChange(row.id, e.target.value)}
                        className="text-[11px] border border-gray-300 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      >
                        {staffList.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer info & Save CTA */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
          <div>
            * Form No: QC/M/023/F/01 | Ref SOP: PM/QC/M/023 | Red indicator shows stock &lt; 10 gm.
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSavePreparation}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold shadow-xs transition"
            >
              {savedSuccess ? "✓ Preparation Saved!" : "Save Changes"}
            </button>
            <button
              onClick={proceedToAutoclave}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold shadow-xs transition"
            >
              Transfer to Step 2: Autoclave &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
