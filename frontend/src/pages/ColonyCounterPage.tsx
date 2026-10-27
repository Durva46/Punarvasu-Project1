/**
 * frontend/src/pages/ColonyCounterPage.tsx
 *
 * Stage 7: Colony Counter Log Book.
 *
 * Header Format from Reference:
 *  - Header: PETLAD MAHAL AROGYA MANDAL PHARMACY, Piplata
 *  - Title: Colony Counter Log Book
 *  - Formate No.: QC/M/025/F/01
 *  - Ref. Sop No.: PM/QC/M/025
 *  - Equipment No.: PM/QC/M/10
 *
 * Columns:
 *  1 Date: Set to the End Date of B.O.D. Incubation (5 days after Start Date).
 *  2 Name of Product: Populated from previous B.O.D. & sample data.
 *  3 B.No.: Product batch identifier.
 *  4 Cleaning: "Everyday cleaning done"
 *  5 Done by: Accountable staff member.
 *
 * Fully editable inline.
 */

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export interface ColonyCounterEntry {
  id: string;
  sourceDate: string; // Original request / start date
  date: string; // End Date of B.O.D. Incubation (DD-MM-YYYY)
  productName: string;
  batchNo: string;
  cleaning: string;
  doneBy: string;
}

export const ColonyCounterPage: React.FC = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<ColonyCounterEntry[]>([]);
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

  useEffect(() => {
    const cachedColony = localStorage.getItem("labflow_colony_counter_entries");
    if (cachedColony) {
      try {
        const parsed = JSON.parse(cachedColony);
        setEntries(parsed);
        const m = localStorage.getItem("labflow_current_month");
        if (m) setSelectedMonth(m);
        return;
      } catch {}
    }

    // Read B.O.D. entries first if available, otherwise read LAF / Excel Daily analysis
    const cachedBodBacteria = localStorage.getItem("labflow_bod_bacteria_entries");
    const cachedLaf = localStorage.getItem("labflow_laf_entries");
    const cachedDaily = localStorage.getItem("labflow_analyzed_daily");

    if (cachedBodBacteria) {
      try {
        const bodItems: Array<{
          id: string;
          date: string;
          productName: string;
          batchNo: string;
          incubationEndDate: string;
          doneBy?: string;
        }> = JSON.parse(cachedBodBacteria);

        if (bodItems.length > 0) {
          const generated: ColonyCounterEntry[] = bodItems.map((item, idx) => ({
            id: `colony-${idx}`,
            sourceDate: item.date,
            date: item.incubationEndDate, // End Date of B.O.D. Incubation
            productName: item.productName,
            batchNo: item.batchNo,
            cleaning: "Everyday cleaning done",
            doneBy: item.doneBy || defaultStaff,
          }));

          setEntries(generated);
          localStorage.setItem("labflow_colony_counter_entries", JSON.stringify(generated));
          return;
        }
      } catch (err) {
        console.error(err);
      }
    }

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

        let lafMap = new Map<string, string>();
        if (cachedLaf) {
          try {
            const lafItems: Array<{ sourceDate: string; date: string }> = JSON.parse(cachedLaf);
            lafItems.forEach((l) => lafMap.set(l.sourceDate, l.date));
          } catch {}
        }

        if (days.length > 0) {
          setSelectedMonth(days[0].displayDate.slice(3));

          const generated: ColonyCounterEntry[] = days.map((d, idx) => {
            const lafDate = lafMap.get(d.displayDate) || addDays(d.displayDate, 1);
            const bodEndDate = addDays(lafDate, 5); // 5 days after B.O.D. start

            const allSampleNames = d.sampleNames && d.sampleNames.length > 0
              ? d.sampleNames.join(", ")
              : "Standard Samples";

            return {
              id: `colony-${d.date}-${idx}`,
              sourceDate: lafDate,
              date: bodEndDate, // End date of B.O.D. as the colony counter date
              productName: allSampleNames,
              batchNo: `B-${bodEndDate.slice(0, 2)}${bodEndDate.slice(3, 5)}`,
              cleaning: "Everyday cleaning done",
              doneBy: defaultStaff,
            };
          });

          setEntries(generated);
          localStorage.setItem("labflow_colony_counter_entries", JSON.stringify(generated));
          return;
        }
      } catch (err) {
        console.error(err);
      }
    }

    // Default sample fallback
    const fallback: ColonyCounterEntry[] = [
      {
        id: "colony-fb-1",
        sourceDate: "02-10-2026",
        date: "07-10-2026", // 5 days after BOD start
        productName: "Cough Syrup Base, Herbal Extract",
        batchNo: "B-0710-1",
        cleaning: "Everyday cleaning done",
        doneBy: defaultStaff,
      },
      {
        id: "colony-fb-2",
        sourceDate: "02-10-2026",
        date: "07-10-2026",
        productName: "Purified Water, Water for Injection",
        batchNo: "B-0710-W",
        cleaning: "Everyday cleaning done",
        doneBy: defaultStaff,
      },
      {
        id: "colony-fb-3",
        sourceDate: "04-10-2026",
        date: "09-10-2026",
        productName: "Lot 101, Lot 102, Lot 103",
        batchNo: "B-0910-1",
        cleaning: "Everyday cleaning done",
        doneBy: defaultStaff,
      },
    ];
    setEntries(fallback);
  }, []);

  const handleUpdateField = (id: string, field: keyof ColonyCounterEntry, value: any) => {
    setEntries((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const handleAddRow = () => {
    const today = new Date();
    const dStr = `${String(today.getDate()).padStart(2, "0")}-${String(today.getMonth() + 1).padStart(2, "0")}-${today.getFullYear()}`;
    const newRow: ColonyCounterEntry = {
      id: `colony-manual-${Date.now()}`,
      sourceDate: dStr,
      date: addDays(dStr, 5),
      productName: "",
      batchNo: "B-MANUAL",
      cleaning: "Everyday cleaning done",
      doneBy: defaultStaff,
    };
    setEntries((prev) => [...prev, newRow]);
  };

  const handleDeleteRow = (id: string) => {
    setEntries((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSave = () => {
    localStorage.setItem("labflow_colony_counter_entries", JSON.stringify(entries));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 font-sans">
      {/* Official Standard Header from User Reference Image */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-2 text-center relative">
        <div className="text-right text-[11px] font-mono text-gray-600 sm:absolute sm:top-4 sm:right-5 space-y-0.5">
          <div><strong>Formate No.:</strong> QC/M/025/F/01</div>
          <div><strong>Ref. Sop No.:</strong> PM/QC/M/025</div>
          <div><strong>Equipment No.:</strong> PM/QC/M/10</div>
        </div>

        <h1 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
          PETLAD MAHAL AROGYA MANDAL PHARMACY
        </h1>
        <p className="text-xs text-gray-500 font-medium">Piplata</p>
        <div className="pt-1">
          <span className="inline-block bg-indigo-50 text-indigo-900 px-3 py-1 rounded text-sm font-bold border border-indigo-300 uppercase tracking-wide">
            Colony Counter Log Book (Stage 7)
          </span>
        </div>
      </div>

      {/* Workflow Navigation Banner */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
            Stage 7 of 7 Laboratory Stages (Colony Enumeration)
          </span>
          <p className="text-xs text-gray-600 mt-1">
            <strong>Date Rule:</strong> Exactly set to the <strong>End Date of B.O.D. Incubation</strong> (5 days post-incubation start date).
            <br />
            <strong>Name of Product:</strong> Extracted from previous B.O.D. incubation & sample data. All fields fully editable inline.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/bod-pathogen"
            className="px-3 py-1.5 border border-gray-300 rounded text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            &larr; Stage 6: B.O.D. Pathogen
          </Link>
          <button
            onClick={handleAddRow}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded text-xs font-semibold border border-gray-300 transition"
          >
            + Add Extra Row
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold shadow-xs transition"
          >
            {savedSuccess ? "✓ Saved" : "Save Colony Counter Log"}
          </button>
        </div>
      </div>

      {/* Main Table Matching Reference Form */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-3.5 border-b border-gray-200 flex flex-wrap justify-between items-center gap-2 bg-gray-50">
          <div>
            <h3 className="text-sm font-bold text-gray-800">
              Colony Counter Log Book — {selectedMonth}
            </h3>
            <p className="text-xs text-gray-500">
              Enumeration operations following completed B.O.D. incubations.
            </p>
          </div>
          <span className="text-xs text-gray-500 bg-white border border-gray-200 px-2.5 py-1 rounded">
            {entries.length} Colony Enumeration Records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-xs">
            <thead className="bg-slate-50 text-gray-700 uppercase font-semibold">
              <tr>
                <th className="px-3.5 py-3 text-left w-36 border-r border-gray-200">Date (BOD End Date)</th>
                <th className="px-4 py-3 text-left border-r border-gray-200">Name of Product</th>
                <th className="px-3.5 py-3 text-left w-32 border-r border-gray-200">B.No.</th>
                <th className="px-4 py-3 text-left w-48 border-r border-gray-200">Cleaning</th>
                <th className="px-3.5 py-3 text-left w-36 border-r border-gray-200">Done by</th>
                <th className="px-2 py-3 text-center w-12">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {entries.map((row) => (
                <tr key={row.id} className="hover:bg-indigo-50/20 transition">
                  {/* Date (End Date of B.O.D. Incubation) */}
                  <td className="px-3.5 py-2.5 border-r border-gray-100">
                    <input
                      type="text"
                      value={row.date}
                      onChange={(e) => handleUpdateField(row.id, "date", e.target.value)}
                      className="w-full text-xs font-semibold text-gray-900 border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="block text-[10px] text-gray-400 mt-0.5">Start: {row.sourceDate}</span>
                  </td>

                  {/* Name of Product */}
                  <td className="px-4 py-2.5 border-r border-gray-100">
                    <input
                      type="text"
                      value={row.productName}
                      onChange={(e) => handleUpdateField(row.id, "productName", e.target.value)}
                      className="w-full text-xs border border-gray-300 rounded px-2.5 py-1 font-medium focus:ring-1 focus:ring-indigo-500"
                    />
                  </td>

                  {/* B.No. (Batch Number) */}
                  <td className="px-3.5 py-2.5 border-r border-gray-100">
                    <input
                      type="text"
                      value={row.batchNo}
                      onChange={(e) => handleUpdateField(row.id, "batchNo", e.target.value)}
                      className="w-full font-mono text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-indigo-500"
                    />
                  </td>

                  {/* Cleaning: Everyday cleaning done */}
                  <td className="px-4 py-2.5 border-r border-gray-100">
                    <div className="flex items-center gap-1.5 min-w-[170px]">
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Everyday Cleaning Done"></span>
                      <input
                        type="text"
                        value={row.cleaning || "Everyday cleaning done"}
                        onChange={(e) => handleUpdateField(row.id, "cleaning", e.target.value)}
                        className="w-full text-xs border border-gray-300 rounded px-2 py-1 text-gray-800 font-medium bg-emerald-50/20 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </td>

                  {/* Done by */}
                  <td className="px-3.5 py-2.5 border-r border-gray-100">
                    <select
                      value={row.doneBy}
                      onChange={(e) => handleUpdateField(row.id, "doneBy", e.target.value)}
                      className="w-full text-[11px] border border-gray-300 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-indigo-500"
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
            * Formate No: QC/M/025/F/01 | Ref. Sop No: PM/QC/M/025 | Equipment No: PM/QC/M/10 | Date corresponds to B.O.D. completion.
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-semibold shadow-xs transition"
            >
              {savedSuccess ? "✓ Changes Saved!" : "Save Colony Counter Log"}
            </button>
            <Link
              to="/reports"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold shadow-xs transition"
            >
              Final Step: Review & Download Reports &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
