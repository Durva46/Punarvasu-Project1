/**
 * frontend/src/pages/MediaPage.tsx
 *
 * Media Preparation Page (Step 1).
 *
 * Exact Formulation & Ledger Rules:
 *
 * 1. Variables per date:
 *    - S = Total samples registered on date
 *    - W = Samples containing "water" in name
 *    - N = S - W (Samples without "water" in name)
 *    - Positive Control = 1
 *    - Negative Control = 1
 *
 * 2. Tube / Plate Formulas:
 *    a) Soybean Casein Digest Broth: Tubes = S * 2
 *    b) Mac Conkey's Broth: Tubes = (S + 1 + 1) * 2
 *    c) Peptone Water to Urea Broth: Tubes = S + 1 + 1
 *    d) R2A Agar (Conditional, ONLY when W > 0): Tubes = W * 2
 *    e) Soybean Casein Digest Agar & Sabouraud Dextrose Agar: Tubes = (N * 2) + 1 + 1
 *
 * 3. Exact Multiplier for Quantity Used (gm) = number of tubes * factor:
 *    - SCDA (Soybean Casein Digest Agar): tubes * 0.80
 *    - SDA (Sabouraud Dextrose Agar): tubes * 1.30
 *    - SCDM / SCDB (Soybean Casein Digest Broth): tubes * 2.70
 *    - Mac Conkey's Broth: tubes * 0.40
 *    - Peptone Water: tubes * 0.07
 *    - Mac Conkey's Agar: tubes * 1.03
 *    - Eosine Methelene Blue Agar (EMB): tubes * 0.75
 *    - Mannitol Salt Agar: tubes * 2.22
 *    - Vogel Johnson Agar: tubes * 1.20
 *    - Baird Parker Agar: tubes * 1.32
 *    - Cetrimide Agar: tubes * 0.91
 *    - Pseudomonas Agar: tubes * 0.96
 *    - Selenite F Broth: tubes * 0.43
 *    - Tetrathionate Broth: tubes * 0.78
 *    - XLD Agar: tubes * 1.10
 *    - BSA Agar: tubes * 1.04
 *    - BGA Agar: tubes * 1.16
 *    - TSI Agar: tubes * 1.41
 *    - Urea Broth: tubes * 0.20
 *    - R2A Agar: (water samples tubes) * 0.36
 *
 * 4. Opening Balance & Running Ledger Balance Rules:
 *    - First date initial opening balance starts at 500.00 gm (per media).
 *    - For every subsequent date, the Opening Balance is carried forward from the PREVIOUS date's ending balance.
 *    - Ending Balance = Opening Balance - Quantity Used.
 *    - If Balance goes negative (shortfall):
 *      STOP process with ALERT: "Balance is below zero! Please refill 500 gm to continue."
 *      Provides a 1-click "Refill +500 gm" action which adds 500 gm and allows the remaining workflow to continue.
 *
 * 5. Friday Holiday Handling:
 *    - Friday samples are automatically merged into Saturday.
 */

import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { formatGrams } from "../lib/format";

export interface MediaDef {
  id: string;
  name: string;
  category: "scdb" | "mac_conkey" | "standard" | "r2a" | "agar_non_water";
  factor: number; // gm per tube
  formulaDisplay: string;
}

export const MEDIA_REGISTRY: MediaDef[] = [
  { id: "m-scdb", name: "Soybean Casein Digest Broth (SCDM)", category: "scdb", factor: 2.70, formulaDisplay: "S × 2" },
  { id: "m-mcb", name: "Mac Conkey's Broth", category: "mac_conkey", factor: 0.40, formulaDisplay: "(S + 1 + 1) × 2" },
  { id: "m-pw", name: "Peptone Water", category: "standard", factor: 0.07, formulaDisplay: "S + 1 + 1" },
  { id: "m-mca", name: "Mac Conkey's Agar", category: "standard", factor: 1.03, formulaDisplay: "S + 1 + 1" },
  { id: "m-emba", name: "Eosine Methelene Blue Agar (EMB)", category: "standard", factor: 0.75, formulaDisplay: "S + 1 + 1" },
  { id: "m-msa", name: "Mannitol Salt Agar", category: "standard", factor: 2.22, formulaDisplay: "S + 1 + 1" },
  { id: "m-vja", name: "Vogel Johnson Agar", category: "standard", factor: 1.20, formulaDisplay: "S + 1 + 1" },
  { id: "m-bpa", name: "Baird Parker Agar", category: "standard", factor: 1.32, formulaDisplay: "S + 1 + 1" },
  { id: "m-ca", name: "Cetrimide Agar", category: "standard", factor: 0.91, formulaDisplay: "S + 1 + 1" },
  { id: "m-pa", name: "Pseudomonas Agar", category: "standard", factor: 0.96, formulaDisplay: "S + 1 + 1" },
  { id: "m-sfb", name: "Selenite F Broth", category: "standard", factor: 0.43, formulaDisplay: "S + 1 + 1" },
  { id: "m-tb", name: "Tetrathionate Broth", category: "standard", factor: 0.78, formulaDisplay: "S + 1 + 1" },
  { id: "m-xlda", name: "Xylose Lysine Deoxycholate (XLD) Agar", category: "standard", factor: 1.10, formulaDisplay: "S + 1 + 1" },
  { id: "m-bsa", name: "Bishmuth Sulphite Agar (BSA)", category: "standard", factor: 1.04, formulaDisplay: "S + 1 + 1" },
  { id: "m-bga", name: "Brilliant Green Agar (BGA)", category: "standard", factor: 1.16, formulaDisplay: "S + 1 + 1" },
  { id: "m-dca", name: "Deoxycholate Citrate Agar (DCA)", category: "standard", factor: 1.00, formulaDisplay: "S + 1 + 1" },
  { id: "m-tsia", name: "Triple Sugar Iron Agar (TSI)", category: "standard", factor: 1.41, formulaDisplay: "S + 1 + 1" },
  { id: "m-ub", name: "Urea Broth", category: "standard", factor: 0.20, formulaDisplay: "S + 1 + 1" },
  // Conditional R2A Agar inserted dynamically before SCDA/SDA when W > 0
  { id: "m-scda", name: "Soybean Casein Digest Agar (SCDA)", category: "agar_non_water", factor: 0.80, formulaDisplay: "(N × 2) + 1 + 1" },
  { id: "m-sda", name: "Sabouraud Dextrose Agar (SDA)", category: "agar_non_water", factor: 1.30, formulaDisplay: "(N × 2) + 1 + 1" },
];

const R2A_DEF: MediaDef = {
  id: "m-r2a",
  name: "R2A Agar (Water Specific)",
  category: "r2a",
  factor: 0.36,
  formulaDisplay: "W × 2",
};

interface PreparedRow {
  id: string;
  name: string;
  category: string;
  factor: number;
  formulaDisplay: string;
  tubesPlates: number;
  openingBalanceGm: number;
  quantityUsedGm: number;
  balanceGm: number;
  preparedBy: string;
  isNegativeShortfall: boolean;
  isConditional?: boolean;
}

interface DayData {
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

  const [availableDays, setAvailableDays] = useState<DayData[]>([]);
  const [selectedDateIso, setSelectedDateIso] = useState<string>("");

  // Ledger state: store ending balance per media across dates
  // mediaId -> running balance
  const [, setMediaLedger] = useState<Record<string, number>>({});
  const [mediaRows, setMediaRows] = useState<PreparedRow[]>([]);

  // Negative balance stopping condition & refill modal state
  const [blockingShortfall, setBlockingShortfall] = useState<{
    mediaId: string;
    mediaName: string;
    opening: number;
    needed: number;
    deficit: number;
  } | null>(null);

  // Staff list
  const defaultStaff = user?.fullName || "Lab Analyst";
  const [selectedStaff, setSelectedStaff] = useState<string>(defaultStaff);
  const staffList = ["Lab Analyst", "QC Chemist", "Microbiologist", "Lab Supervisor", defaultStaff].filter(
    (v, i, a) => a.indexOf(v) === i
  );

  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // 1. Load days on mount from analysis
  useEffect(() => {
    const cachedDaily = localStorage.getItem("labflow_analyzed_daily");
    if (cachedDaily) {
      try {
        const days: DayData[] = JSON.parse(cachedDaily);
        setAvailableDays(days);
        if (days.length > 0) {
          const preselected = localStorage.getItem("labflow_selected_date");
          const found = days.find((d) => d.date === preselected || d.displayDate === preselected);
          setSelectedDateIso(found ? found.date : days[0].date);
        }
      } catch (e) {
        console.error(e);
      }
    } else {
      // Fallback sample day
      const fallback: DayData = {
        date: new Date().toISOString().slice(0, 10),
        displayDate: "27-10-2026",
        total: 4,
        water: 1,
        nonWater: 3,
        sampleNames: ["Water for Injection", "Purified Water", "Liquid Glucose", "Cough Syrup"],
      };
      setAvailableDays([fallback]);
      setSelectedDateIso(fallback.date);
    }
  }, []);

  const currentDay = availableDays.find((d) => d.date === selectedDateIso) || availableDays[0];
  const S = currentDay?.total || 0;
  const W = currentDay?.water || 0;
  const N = currentDay?.nonWater || Math.max(0, S - W);
  const positiveControl = 1;
  const negativeControl = 1;

  // 2. Recompute ledger and current day rows whenever days or selected date changes
  useEffect(() => {
    if (!currentDay || availableDays.length === 0) return;

    // Load any user refills from storage
    const refillsKey = "labflow_media_refills";
    const refills: Record<string, number> = JSON.parse(localStorage.getItem(refillsKey) || "{}");

    // ─────────────────────────────────────────────────────────────────────────
    // SEQUENTIAL CASCADE LEDGER (as shown in user specification):
    //
    // The very 1st media starts with initial Opening Balance = 500.00 gm (+ user refills).
    // Row 1: Opening = 500.00,  Qty Used = 16.20,  Balance = 500.00 - 16.20 = 483.80
    // Row 2: Opening = 483.80 (from previous media's balance), Qty Used = 4.80, Balance = 483.80 - 4.80 = 479.00
    // Row 3: Opening = 479.00 (from previous media's balance), ...
    //
    // When moving to the next day:
    // Next day's 1st media Opening Balance = Previous day's final media Balance!
    // ─────────────────────────────────────────────────────────────────────────
    const sortedDays = [...availableDays].sort((a, b) => a.date.localeCompare(b.date));
    let currentPoolBalance = 500.0 + (refills["global_pool"] || 0);

    let targetRows: PreparedRow[] = [];
    let detectedDeficit: typeof blockingShortfall = null;

    for (const d of sortedDays) {
      const dayS = d.total;
      const dayW = d.water;
      const dayN = d.nonWater;

      // Construct media list for day (R2A inserted if dayW > 0)
      const list: MediaDef[] = [];
      MEDIA_REGISTRY.forEach((m) => {
        if (m.id === "m-scda" && dayW > 0) {
          list.push(R2A_DEF);
        }
        list.push(m);
      });

      const dayRows: PreparedRow[] = [];

      for (const m of list) {
        // Calculate tube count
        let tubes = 0;
        switch (m.category) {
          case "scdb":
            tubes = dayS * 2;
            break;
          case "mac_conkey":
            tubes = (dayS + positiveControl + negativeControl) * 2;
            break;
          case "standard":
            tubes = dayS + positiveControl + negativeControl;
            break;
          case "r2a":
            tubes = dayW * 2;
            break;
          case "agar_non_water":
            tubes = dayN * 2 + positiveControl + negativeControl;
            break;
        }

        // Calculate quantity used (gm) = number of tubes * factor
        const qtyUsed = parseFloat((tubes * m.factor).toFixed(2));
        const opening = parseFloat(currentPoolBalance.toFixed(2));
        const balance = parseFloat((opening - qtyUsed).toFixed(2));

        const isNegative = balance < 0;

        // If shortfall detected on or before selected date, record for blocking alert
        if (isNegative && !detectedDeficit && d.date <= currentDay.date) {
          detectedDeficit = {
            mediaId: m.id,
            mediaName: m.name,
            opening,
            needed: qtyUsed,
            deficit: parseFloat((qtyUsed - opening).toFixed(2)),
          };
        }

        // The calculated balance cascades as the Opening Balance for the NEXT media row!
        currentPoolBalance = balance;

        if (d.date === currentDay.date) {
          dayRows.push({
            id: m.id,
            name: m.name,
            category: m.category,
            factor: m.factor,
            formulaDisplay: m.formulaDisplay,
            tubesPlates: tubes,
            openingBalanceGm: opening,
            quantityUsedGm: qtyUsed,
            balanceGm: balance,
            preparedBy: selectedStaff,
            isNegativeShortfall: isNegative,
            isConditional: m.category === "r2a",
          });
        }
      }

      if (d.date === currentDay.date) {
        targetRows = dayRows;
      }
    }

    setMediaLedger({ global_pool: currentPoolBalance });
    setMediaRows(targetRows);
    setBlockingShortfall(detectedDeficit);
  }, [availableDays, selectedDateIso, selectedStaff]);

  // Handle refill 500gm when balance goes below zero
  const handleRefill500g = (mediaId?: string) => {
    const refillsKey = "labflow_media_refills";
    const refills: Record<string, number> = JSON.parse(localStorage.getItem(refillsKey) || "{}");
    refills["global_pool"] = (refills["global_pool"] || 0) + 500.0;
    if (mediaId) {
      refills[mediaId] = (refills[mediaId] || 0) + 500.0;
    }
    localStorage.setItem(refillsKey, JSON.stringify(refills));

    setBlockingShortfall(null);
    setAvailableDays((prev) => [...prev]);
  };

  // Reset entire ledger to initial 500g
  const handleResetLedger = () => {
    localStorage.removeItem("labflow_media_refills");
    setBlockingShortfall(null);
    setAvailableDays((prev) => [...prev]);
  };

  // Save current day preparation record
  const handleSavePreparation = () => {
    if (!currentDay) return;
    const storageKey = `labflow_media_prep_${currentDay.date}`;
    localStorage.setItem(storageKey, JSON.stringify(mediaRows));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Direct user editing handler for Media Preparation rows
  const handleEditMediaRow = (
    rowId: string,
    field: "name" | "tubesPlates" | "factor" | "openingBalanceGm" | "preparedBy",
    value: string
  ) => {
    setMediaRows((prev) => {
      const updated = prev.map((r) => {
        if (r.id !== rowId) return r;

        let numVal = parseFloat(value) || 0;
        let newTubes = field === "tubesPlates" ? Math.max(0, parseInt(value, 10) || 0) : r.tubesPlates;
        let newFactor = field === "factor" ? Math.max(0, numVal) : r.factor;
        let newOpening = field === "openingBalanceGm" ? numVal : r.openingBalanceGm;
        let newName = field === "name" ? value : r.name;
        let newStaff = field === "preparedBy" ? value : r.preparedBy;

        const newQtyUsed = parseFloat((newTubes * newFactor).toFixed(2));
        const newBalance = parseFloat((newOpening - newQtyUsed).toFixed(2));

        return {
          ...r,
          name: newName,
          tubesPlates: newTubes,
          factor: newFactor,
          openingBalanceGm: newOpening,
          quantityUsedGm: newQtyUsed,
          balanceGm: newBalance,
          preparedBy: newStaff,
          isNegativeShortfall: newBalance < 0,
        };
      });

      if (currentDay) {
        localStorage.setItem(`labflow_media_prep_${currentDay.date}`, JSON.stringify(updated));
      }
      return updated;
    });
  };

  // Proceed to Step 2: Autoclave
  const proceedToAutoclave = () => {
    if (blockingShortfall) {
      alert(`Cannot proceed! ${blockingShortfall.mediaName} has a negative balance (${blockingShortfall.deficit} gm shortfall). Please refill 500 gm first.`);
      return;
    }
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
            Initial opening balance: <strong>500 gm</strong>. Subsequent opening balances automatically carried forward from previous day's closing balance.
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
            disabled={!!blockingShortfall}
            className={`px-4 py-2 text-white rounded text-xs font-semibold shadow-sm transition ${
              blockingShortfall
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
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
              Media Preparation Date:
            </label>
            <select
              value={selectedDateIso}
              onChange={(e) => {
                setSelectedDateIso(e.target.value);
                localStorage.setItem("labflow_selected_date", e.target.value);
              }}
              className="text-xs font-bold border border-gray-300 rounded px-3 py-1.5 bg-white shadow-xs focus:ring-1 focus:ring-blue-500 focus:outline-none text-blue-700"
            >
              {availableDays.map((d) => (
                <option key={d.date} value={d.date}>
                  {d.displayDate} ({d.total} samples)
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">
              Responsible Staff:
            </span>
            <select
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
              className="text-xs border border-gray-300 rounded px-2.5 py-1 bg-white font-medium"
            >
              {staffList.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
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
            {W > 0 && <span className="block text-[10px] text-blue-600 mt-0.5">R2A Agar Row Added</span>}
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

        {/* Media Preparation Date and Samples Tested */}
        {currentDay && (
          <div className="text-xs text-gray-700 bg-gray-50 p-3 rounded border border-gray-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-bold text-gray-900 bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                Media Preparation Date: {currentDay.displayDate}
              </span>
              <span className="font-semibold text-gray-600 ml-2">
                Samples tested on this date ({currentDay.sampleNames.length}):
              </span>
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
          </div>
        )}
      </div>

      {/* BLOCKING ALERT: Shortfall / Negative Balance */}
      {blockingShortfall && (
        <div className="bg-red-50 border-2 border-red-500 rounded-lg p-5 shadow-sm space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🛑</span>
            <div className="flex-1">
              <h2 className="text-sm font-bold text-red-900 uppercase tracking-wide">
                Process Stopped: Negative Balance Alert!
              </h2>
              <p className="text-xs text-red-800 mt-1">
                The balance for <strong>{blockingShortfall.mediaName}</strong> has fallen below zero (deficit:{" "}
                <span className="font-bold text-red-600">-{blockingShortfall.deficit} gm</span>).
                Required quantity ({blockingShortfall.needed} gm) exceeds current opening balance ({blockingShortfall.opening} gm).
              </p>
              <p className="text-xs font-semibold text-red-900 mt-1">
                Please refill 500 gm of stock to replenish inventory and continue the workflow.
              </p>
            </div>
            <button
              onClick={() => handleRefill500g(blockingShortfall.mediaId)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded shadow transition whitespace-nowrap"
            >
              + Refill 500 gm Now
            </button>
          </div>
        </div>
      )}

      {/* Media Preparation Table */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex flex-wrap justify-between items-center gap-2 bg-gray-50">
          <div>
            <h3 className="text-sm font-bold text-gray-800">
              Media Preparation Table — {currentDay?.displayDate}
            </h3>
            <p className="text-xs text-gray-500">
              Quantity Used = Tubes × Grams per tube. Balance = Opening Balance − Quantity Used.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetLedger}
              title="Reset all media to 500 gm initial stock"
              className="px-3 py-1.5 border border-gray-300 rounded text-xs font-medium text-gray-600 hover:bg-gray-100 transition"
            >
              Reset to 500g Initial
            </button>
            <button
              onClick={handleSavePreparation}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold shadow-xs transition"
            >
              {savedSuccess ? "✓ Saved" : "Save Preparation Log"}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-xs">
            <thead className="bg-slate-50 text-gray-700 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3 text-left w-24">Date</th>
                <th className="px-4 py-3 text-left">Name of Media</th>
                <th className="px-4 py-3 text-center w-28">Formula Used</th>
                <th className="px-4 py-3 text-center w-24">Tube / Plates</th>
                <th className="px-4 py-3 text-right w-28">Factor (gm/tube)</th>
                <th className="px-4 py-3 text-right w-32">Opening (gm)</th>
                <th className="px-4 py-3 text-right w-36">Quantity Used (gm)</th>
                <th className="px-4 py-3 text-right w-32">Balance (gm)</th>
                <th className="px-4 py-3 text-center w-28">Stock Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {mediaRows.map((row) => {
                const isShortfall = row.balanceGm < 0;
                return (
                  <tr
                    key={row.id}
                    className={`hover:bg-blue-50/20 transition ${
                      isShortfall
                        ? "bg-red-50/40"
                        : row.isConditional
                        ? "bg-blue-50/15"
                        : ""
                    }`}
                  >
                    {/* Date */}
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                      {currentDay?.displayDate}
                    </td>

                    {/* Name of Media */}
                    <td className="px-3 py-2 font-semibold text-gray-900">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={row.name}
                          onChange={(e) => handleEditMediaRow(row.id, "name", e.target.value)}
                          className="w-full text-xs font-semibold px-2 py-1 border border-gray-300 rounded bg-white focus:ring-1 focus:ring-blue-500"
                        />
                        {row.isConditional && (
                          <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-blue-800 font-bold border border-blue-200">
                            Water Specific
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Formula Description */}
                    <td className="px-3 py-2 text-center font-mono text-[11px] text-gray-500 whitespace-nowrap">
                      {row.formulaDisplay}
                    </td>

                    {/* Tubes / Plates Result */}
                    <td className="px-3 py-2 text-center">
                      <input
                        type="number"
                        min="0"
                        value={row.tubesPlates}
                        onChange={(e) => handleEditMediaRow(row.id, "tubesPlates", e.target.value)}
                        className="w-16 text-center font-bold text-blue-800 bg-blue-50/70 border border-blue-300 rounded px-1.5 py-1 text-xs focus:ring-1 focus:ring-blue-500"
                      />
                    </td>

                    {/* Factor (gm per tube) */}
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={row.factor}
                        onChange={(e) => handleEditMediaRow(row.id, "factor", e.target.value)}
                        className="w-16 text-right font-mono text-gray-700 bg-white border border-gray-300 rounded px-1.5 py-1 text-xs focus:ring-1 focus:ring-blue-500"
                      />
                    </td>

                    {/* Opening Balance (gm) */}
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        step="0.1"
                        value={row.openingBalanceGm}
                        onChange={(e) => handleEditMediaRow(row.id, "openingBalanceGm", e.target.value)}
                        className="w-20 text-right font-mono font-medium text-gray-800 bg-white border border-gray-300 rounded px-1.5 py-1 text-xs focus:ring-1 focus:ring-blue-500"
                      />
                    </td>

                    {/* Quantity Used (gm) = tubes * factor */}
                    <td className="px-4 py-3 text-right font-mono font-bold text-blue-700">
                      {formatGrams(row.quantityUsedGm)} gm
                    </td>

                    {/* Calculated Balance (gm) */}
                    <td className="px-4 py-3 text-right font-mono font-bold">
                      <span
                        className={
                          isShortfall
                            ? "text-red-700 bg-red-100 px-2 py-0.5 rounded"
                            : row.balanceGm < 10
                            ? "text-amber-700"
                            : "text-emerald-700"
                        }
                      >
                        {formatGrams(row.balanceGm)} gm
                      </span>
                    </td>

                    {/* Stock Status / Refill Action */}
                    <td className="px-4 py-3 text-center">
                      {isShortfall ? (
                        <button
                          onClick={() => handleRefill500g(row.id)}
                          className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold shadow-xs animate-pulse"
                        >
                          Refill 500g
                        </button>
                      ) : row.balanceGm < 10 ? (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-bold">
                          Low Stock ⚠️
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold">
                          OK ✓
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer info & CTA */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
          <div>
            * Form No: QC/M/023/F/01 | Ref SOP: PM/QC/M/023 | Red alert blocks continuation until 500 gm refill.
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSavePreparation}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold shadow-xs transition"
            >
              {savedSuccess ? "✓ Saved Preparation" : "Save Changes"}
            </button>
            <button
              onClick={proceedToAutoclave}
              disabled={!!blockingShortfall}
              className={`px-4 py-2 text-white rounded font-semibold shadow-xs transition ${
                blockingShortfall
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              Proceed to Step 2: Autoclave &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
