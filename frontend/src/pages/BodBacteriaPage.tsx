/**
 * frontend/src/pages/BodBacteriaPage.tsx
 *
 * Stage 4: B.O.D. Incubator Log Book for Bacteria (Set Temperature 30-35° C).
 *
 * Header Format from Reference:
 *  - Header: PETLAD MAHAL AROGYA MANDAL PHARMACY, Piplata
 *  - Title: B.O.D. Incubator Log Book for Bacteria (Set Temperature 30-35° C)
 *  - Formate No.: QC/M/024/F/01
 *  - Ref. Sop No.: PM/QC/M/024
 *  - Equipment No.: PM/QC/M/03
 *
 * Columns:
 *  1 Date (Same date as LAF)
 *  2 Name of Product (Sample names)
 *  3 Media:
 *     - For non-water samples: "SCDA"
 *     - For samples containing "Water" in their name: "R2A"
 *  4 B.No. (Batch Number)
 *  5 NO.OF plats/tubes:
 *     - For non-water samples: (non_water_samples * 2) + 2
 *     - For water samples: (water_samples * 2) + 2
 *  6 Incubation (Nested Header):
 *     - Start Date: Same date as LAF
 *     - End Date: 5 days after Start Date
 *  7 Cleaning Record (Everyday cleaning done)
 *  8 Done by
 *
 * Fully editable inline.
 */

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export interface BodBacteriaEntry {
  id: string;
  date: string; // Same date as LAF (DD-MM-YYYY)
  productName: string; // Name of sample
  media: "SCDA" | "R2A";
  batchNo: string;
  sampleCount: number;
  platesTubes: number; // Formula: (sampleCount * 2) + 2
  incubationStartDate: string; // Same date as LAF
  incubationEndDate: string; // 5 days after Start Date
  cleaningRecord: string; // Everyday cleaning done
  doneBy: string;
  isWater: boolean;
}

export const BodBacteriaPage: React.FC = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<BodBacteriaEntry[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>("Current Month");
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const defaultStaff = user?.fullName || "Lab Analyst";
  const staffList = ["Lab Analyst", "QC Chemist", "Microbiologist", "Lab Supervisor", defaultStaff].filter(
    (v, i, a) => a.indexOf(v) === i
  );

  // Helper to add N days to a DD-MM-YYYY date string
  const addDays = (dateStr: string, daysToAdd: number): string => {
    try {
      const parts = dateStr.split(/[-/]/);
      if (parts.length === 3) {
        let d = parseInt(parts[0], 10);
        let m = parseInt(parts[1], 10) - 1;
        let y = parseInt(parts[2], 10);
        if (parts[0].length === 4) {
          y = parseInt(parts[0], 10);
          m = parseInt(parts[1], 10) - 1;
          d = parseInt(parts[2], 10);
        }
        const dt = new Date(y, m, d);
        dt.setDate(dt.getDate() + daysToAdd);
        const nextD = String(dt.getDate()).padStart(2, "0");
        const nextM = String(dt.getMonth() + 1).padStart(2, "0");
        const nextY = dt.getFullYear();
        return `${nextD}-${nextM}-${nextY}`;
      }
    } catch {}
    return dateStr;
  };

  // Helper to compute next day from DD-MM-YYYY
  const getNextDay = (dateStr: string): string => addDays(dateStr, 1);

  // Load and align with LAF dates & samples
  useEffect(() => {
    const cachedBod = localStorage.getItem("labflow_bod_bacteria_entries");
    if (cachedBod) {
      try {
        const parsed = JSON.parse(cachedBod);
        setEntries(parsed);
        const m = localStorage.getItem("labflow_current_month");
        if (m) setSelectedMonth(m);
        return;
      } catch {}
    }

    // Read LAF entries or Excel daily analysis
    const cachedLaf = localStorage.getItem("labflow_laf_entries");
    const cachedDaily = localStorage.getItem("labflow_analyzed_daily");

    if (cachedDaily) {
      try {
        const days: Array<{
          date: string;
          displayDate: string;
          total: number;
          water: number;
          nonWater: number;
          sampleNames: string[];
        }> = JSON.parse(cachedDaily);

        let lafMap = new Map<string, string>(); // sourceDate -> lafDate
        if (cachedLaf) {
          try {
            const lafItems: Array<{ sourceDate: string; date: string }> = JSON.parse(cachedLaf);
            lafItems.forEach((l) => lafMap.set(l.sourceDate, l.date));
          } catch {}
        }

        if (days.length > 0) {
          setSelectedMonth(days[0].displayDate.slice(3));

          const generated: BodBacteriaEntry[] = [];

          days.forEach((d, idx) => {
            // Same date as LAF:
            const lafDate = lafMap.get(d.displayDate) ||
              (idx + 1 < days.length ? days[idx + 1].displayDate : getNextDay(d.displayDate));
            const endDate = addDays(lafDate, 5);

            // Separate non-water samples and water samples
            const waterSamples = d.sampleNames.filter((name) => name.toLowerCase().includes("water"));
            const nonWaterSamples = d.sampleNames.filter((name) => !name.toLowerCase().includes("water"));

            const nonWaterCount = d.nonWater || nonWaterSamples.length;
            const waterCount = d.water || waterSamples.length;

            // 1. Non-water sample entry (Media = "SCDA", Tubes = (non_water * 2) + 2)
            if (nonWaterCount > 0 || (nonWaterCount === 0 && waterCount === 0)) {
              const nonWaterName = nonWaterSamples.length > 0
                ? nonWaterSamples.join(", ")
                : "Standard Samples";
              const count = Math.max(1, nonWaterCount);
              generated.push({
                id: `bod-nw-${d.date}-${idx}`,
                date: lafDate, // Same date as LAF
                productName: nonWaterName,
                media: "SCDA",
                batchNo: `B-${lafDate.slice(0, 2)}${lafDate.slice(3, 5)}-1`,
                sampleCount: count,
                platesTubes: (count * 2) + 2, // Formula: (non-water * 2) + 2
                incubationStartDate: lafDate, // Same date as LAF
                incubationEndDate: endDate, // 5 days after
                cleaningRecord: "Everyday cleaning done",
                doneBy: defaultStaff,
                isWater: false,
              });
            }

            // 2. Water sample entry (Media = "R2A", Tubes = (water * 2) + 2)
            if (waterCount > 0) {
              const waterName = waterSamples.length > 0
                ? waterSamples.join(", ")
                : "Water Samples";
              generated.push({
                id: `bod-w-${d.date}-${idx}`,
                date: lafDate, // Same date as LAF
                productName: waterName,
                media: "R2A",
                batchNo: `B-${lafDate.slice(0, 2)}${lafDate.slice(3, 5)}-W`,
                sampleCount: waterCount,
                platesTubes: (waterCount * 2) + 2, // Formula: (water * 2) + 2
                incubationStartDate: lafDate, // Same date as LAF
                incubationEndDate: endDate, // 5 days after
                cleaningRecord: "Everyday cleaning done",
                doneBy: defaultStaff,
                isWater: true,
              });
            }
          });

          setEntries(generated);
          localStorage.setItem("labflow_bod_bacteria_entries", JSON.stringify(generated));
          return;
        }
      } catch (e) {
        console.error(e);
      }
    }

    // Default sample fallback
    const fallback: BodBacteriaEntry[] = [
      {
        id: "bod-fb-1",
        date: "02-10-2026",
        productName: "Cough Syrup Base, Herbal Extract",
        media: "SCDA",
        batchNo: "B-0210-1",
        sampleCount: 2,
        platesTubes: (2 * 2) + 2, // 6
        incubationStartDate: "02-10-2026",
        incubationEndDate: "07-10-2026", // +5 days
        cleaningRecord: "Everyday cleaning done",
        doneBy: defaultStaff,
        isWater: false,
      },
      {
        id: "bod-fb-2",
        date: "02-10-2026",
        productName: "Purified Water, Water for Injection",
        media: "R2A",
        batchNo: "B-0210-W",
        sampleCount: 2,
        platesTubes: (2 * 2) + 2, // 6
        incubationStartDate: "02-10-2026",
        incubationEndDate: "07-10-2026", // +5 days
        cleaningRecord: "Everyday cleaning done",
        doneBy: defaultStaff,
        isWater: true,
      },
    ];
    setEntries(fallback);
  }, []);

  // Update field (fully editable at every point)
  const handleUpdateField = (id: string, field: keyof BodBacteriaEntry, value: any) => {
    setEntries((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, [field]: value };

        // Auto-recalculate tubes when sampleCount changes
        if (field === "sampleCount") {
          const count = parseInt(value, 10) || 0;
          updated.platesTubes = (count * 2) + 2;
        }

        // Auto-recalculate incubationEndDate when incubationStartDate changes (+5 days)
        if (field === "incubationStartDate") {
          updated.incubationEndDate = addDays(value, 5);
          updated.date = value;
        }

        return updated;
      })
    );
  };

  const handleAddRow = () => {
    const today = new Date();
    const dStr = `${String(today.getDate()).padStart(2, "0")}-${String(today.getMonth() + 1).padStart(2, "0")}-${today.getFullYear()}`;
    const newRow: BodBacteriaEntry = {
      id: `bod-manual-${Date.now()}`,
      date: dStr,
      productName: "",
      media: "SCDA",
      batchNo: "B-MANUAL",
      sampleCount: 1,
      platesTubes: (1 * 2) + 2,
      incubationStartDate: dStr,
      incubationEndDate: addDays(dStr, 5),
      cleaningRecord: "Everyday cleaning done",
      doneBy: defaultStaff,
      isWater: false,
    };
    setEntries((prev) => [...prev, newRow]);
  };

  const handleDeleteRow = (id: string) => {
    setEntries((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSave = () => {
    localStorage.setItem("labflow_bod_bacteria_entries", JSON.stringify(entries));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 font-sans">
      {/* Official Standard Header from User Reference Image */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-2 text-center relative">
        <div className="text-right text-[11px] font-mono text-gray-600 sm:absolute sm:top-4 sm:right-5 space-y-0.5">
          <div><strong>Formate No.:</strong> QC/M/024/F/01</div>
          <div><strong>Ref. Sop No.:</strong> PM/QC/M/024</div>
          <div><strong>Equipment No.:</strong> PM/QC/M/03</div>
        </div>

        <h1 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
          PETLAD MAHAL AROGYA MANDAL PHARMACY
        </h1>
        <p className="text-xs text-gray-500 font-medium">Piplata</p>
        <div className="pt-1">
          <span className="inline-block bg-emerald-50 text-emerald-900 px-3 py-1 rounded text-sm font-bold border border-emerald-300 uppercase tracking-wide">
            B.O.D. Incubator Log Book for Bacteria (Set Temperature 30-35° C)
          </span>
        </div>
      </div>

      {/* Workflow Navigation Banner */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            Stage 4 of 7 Laboratory Stages
          </span>
          <p className="text-xs text-gray-600 mt-1">
            <strong>Date & Incubation Start Date:</strong> Same as LAF Date | <strong>Incubation End Date:</strong> Exactly 5 days after Start Date.
            <br />
            <strong>Media & Plates/Tubes Calculation:</strong> Non-water samples &rarr; <strong>SCDA</strong>, tubes = <code>(N × 2) + 2</code> | Water samples &rarr; <strong>R2A</strong>, tubes = <code>(W × 2) + 2</code>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/laf"
            className="px-3 py-1.5 border border-gray-300 rounded text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            &larr; Stage 3: LAF Log
          </Link>
          <button
            onClick={handleAddRow}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded text-xs font-semibold border border-gray-300 transition"
          >
            + Add Extra Row
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold shadow-xs transition"
          >
            {savedSuccess ? "✓ Saved" : "Save B.O.D. Log"}
          </button>
        </div>
      </div>

      {/* Main Table Matching Reference Form */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-3.5 border-b border-gray-200 flex flex-wrap justify-between items-center gap-2 bg-gray-50">
          <div>
            <h3 className="text-sm font-bold text-gray-800">
              B.O.D. Incubator (Bacteria 30-35° C) — {selectedMonth}
            </h3>
            <p className="text-xs text-gray-500">
              Every value is editable at every point.
            </p>
          </div>
          <span className="text-xs text-gray-500 bg-white border border-gray-200 px-2.5 py-1 rounded">
            {entries.length} Incubations
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-xs">
            <thead className="bg-slate-50 text-gray-700 uppercase font-semibold">
              <tr>
                <th rowSpan={2} className="px-3 py-3 text-left w-28 border-r border-gray-200">Date</th>
                <th rowSpan={2} className="px-3 py-3 text-left border-r border-gray-200">Name of Product</th>
                <th rowSpan={2} className="px-3 py-3 text-center w-24 border-r border-gray-200">Media</th>
                <th rowSpan={2} className="px-3 py-3 text-left w-24 border-r border-gray-200">B.No.</th>
                <th rowSpan={2} className="px-3 py-3 text-center w-28 border-r border-gray-200">NO.OF plats/tubes</th>
                <th colSpan={2} className="px-3 py-1.5 text-center border-b border-r border-gray-200 bg-slate-100">Incubation</th>
                <th rowSpan={2} className="px-3 py-3 text-left w-48 border-r border-gray-200">Cleaning Record</th>
                <th rowSpan={2} className="px-3 py-3 text-left w-32 border-r border-gray-200">Done by</th>
                <th rowSpan={2} className="px-2 py-3 text-center w-12">Action</th>
              </tr>
              <tr>
                <th className="px-3 py-1.5 text-center w-28 border-r border-gray-200 bg-slate-100 font-semibold text-[11px]">Start Date</th>
                <th className="px-3 py-1.5 text-center w-28 border-r border-gray-200 bg-slate-100 font-semibold text-[11px]">End Date (+5d)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {entries.map((row) => (
                <tr key={row.id} className="hover:bg-blue-50/20 transition">
                  {/* Date (Same as LAF) */}
                  <td className="px-3 py-2.5 border-r border-gray-100">
                    <input
                      type="text"
                      value={row.date}
                      onChange={(e) => handleUpdateField(row.id, "date", e.target.value)}
                      className="w-full text-xs font-semibold text-gray-900 border border-gray-300 rounded px-1.5 py-1 focus:ring-1 focus:ring-blue-500"
                    />
                  </td>

                  {/* Name of Product */}
                  <td className="px-3 py-2.5 border-r border-gray-100">
                    <input
                      type="text"
                      value={row.productName}
                      onChange={(e) => handleUpdateField(row.id, "productName", e.target.value)}
                      className="w-full text-xs border border-gray-300 rounded px-2 py-1 font-medium focus:ring-1 focus:ring-blue-500"
                    />
                  </td>

                  {/* Media: SCDA or R2A */}
                  <td className="px-3 py-2.5 text-center border-r border-gray-100">
                    <select
                      value={row.media}
                      onChange={(e) => handleUpdateField(row.id, "media", e.target.value as "SCDA" | "R2A")}
                      className={`text-xs font-bold border rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 ${
                        row.media === "R2A"
                          ? "bg-blue-50 text-blue-800 border-blue-300"
                          : "bg-emerald-50 text-emerald-800 border-emerald-300"
                      }`}
                    >
                      <option value="SCDA">SCDA</option>
                      <option value="R2A">R2A</option>
                    </select>
                  </td>

                  {/* B.No. (Batch Number) */}
                  <td className="px-3 py-2.5 border-r border-gray-100">
                    <input
                      type="text"
                      value={row.batchNo}
                      onChange={(e) => handleUpdateField(row.id, "batchNo", e.target.value)}
                      className="w-full font-mono text-xs border border-gray-300 rounded px-1.5 py-1 focus:ring-1 focus:ring-blue-500"
                    />
                  </td>

                  {/* NO.OF plats/tubes: (samples * 2) + 2 */}
                  <td className="px-3 py-2.5 text-center border-r border-gray-100">
                    <div className="flex items-center justify-center gap-1">
                      <input
                        type="number"
                        min="1"
                        value={row.platesTubes}
                        onChange={(e) => handleUpdateField(row.id, "platesTubes", parseInt(e.target.value, 10) || 0)}
                        className="w-14 text-center font-bold text-blue-700 bg-blue-50/50 border border-blue-300 rounded px-1 py-1 text-xs focus:ring-1 focus:ring-blue-500"
                      />
                      <span className="text-[10px] text-gray-400">
                        ({row.sampleCount}s)
                      </span>
                    </div>
                  </td>

                  {/* Incubation Start Date (Same as LAF) */}
                  <td className="px-3 py-2.5 text-center border-r border-gray-100 font-mono text-xs">
                    <input
                      type="text"
                      value={row.incubationStartDate}
                      onChange={(e) => handleUpdateField(row.id, "incubationStartDate", e.target.value)}
                      className="w-full text-center text-xs font-semibold text-gray-800 border border-gray-300 rounded px-1 py-1 focus:ring-1 focus:ring-blue-500"
                    />
                  </td>

                  {/* Incubation End Date (5 days after Start Date) */}
                  <td className="px-3 py-2.5 text-center border-r border-gray-100 font-mono text-xs">
                    <input
                      type="text"
                      value={row.incubationEndDate}
                      onChange={(e) => handleUpdateField(row.id, "incubationEndDate", e.target.value)}
                      className="w-full text-center text-xs font-bold text-emerald-800 bg-emerald-50/50 border border-emerald-300 rounded px-1 py-1 focus:ring-1 focus:ring-blue-500"
                    />
                  </td>

                  {/* Cleaning Record: Everyday cleaning done */}
                  <td className="px-3 py-2.5 border-r border-gray-100">
                    <div className="flex items-center gap-1.5 min-w-[175px]">
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Everyday Cleaning Done"></span>
                      <input
                        type="text"
                        value={row.cleaningRecord || "Everyday cleaning done"}
                        onChange={(e) => handleUpdateField(row.id, "cleaningRecord", e.target.value)}
                        className="w-full text-xs border border-gray-300 rounded px-2 py-1 text-gray-800 font-medium bg-emerald-50/20 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </td>

                  {/* Done by */}
                  <td className="px-3 py-2.5 border-r border-gray-100">
                    <select
                      value={row.doneBy}
                      onChange={(e) => handleUpdateField(row.id, "doneBy", e.target.value)}
                      className="w-full text-[11px] border border-gray-300 rounded px-1.5 py-1 bg-white focus:ring-1 focus:ring-blue-500"
                    >
                      {staffList.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Action */}
                  <td className="px-2 py-2.5 text-center">
                    <button
                      onClick={() => handleDeleteRow(row.id)}
                      className="text-gray-400 hover:text-red-600 font-bold text-xs"
                      title="Delete row"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
          <div>
            * Formate No: QC/M/024/F/01 | Ref. Sop No: PM/QC/M/024 | Equipment No: PM/QC/M/03 | Incubation: 30-35° C for 5 days.
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold shadow-xs transition"
            >
              {savedSuccess ? "✓ Changes Saved!" : "Save B.O.D. Log"}
            </button>
            <Link
              to="/reports"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold shadow-xs transition"
            >
              Next Step: Reports &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
