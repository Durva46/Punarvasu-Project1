/**
 * frontend/src/pages/LafPage.tsx
 *
 * Stage 3: Laminar Air Flow (LAF) Log Book.
 *
 * Header Format:
 *  - Title: PETLAD MAHAL AROGYA MANDAL PHARMACY, At & Po. Village- Piplata- 387355, Ta.: Nadiad, Dist.: Kheda (Gujarat)
 *  - Sub-title: Laminar Air Flow - Log Book
 *  - Format No.: QC/M/026/F/01
 *  - Ref. SOP No.: PM/QC/M/026
 *  - Equipment No.: PM/QC/M/05
 *
 * Columns:
 *  1 Date (Next day / second day of test request date / product received date)
 *  2 Start Time (Default: 2:00 PM)
 *  3 Name of Product
 *  4 Batch No.
 *  5 Manometer Reading (in mm) (Default: 11 mm)
 *  6 UV Burning Hours (Default: 20 mins)
 *  7 End Time:
 *     - If number of samples of that date == 5  -> 4:00 PM
 *     - If number of samples of that date > 5   -> 5:00 PM
 *     - If number of samples of that date < 5   -> 3:30 PM
 *  8 Cleaning Record (Daily clean record)
 *  9 Done By
 *  10 Checked By
 *
 * Editable at every point.
 */

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export interface LafEntry {
  id: string;
  sourceDate: string; // Original request date (DD-MM-YYYY)
  date: string; // Next day date (DD-MM-YYYY)
  startTime: string; // e.g. 02:00 PM
  productName: string;
  batchNo: string;
  manometerReadingMm: number; // e.g. 11
  uvBurningHours: string; // e.g. 20 mins
  sampleCount: number;
  endTime: string; // e.g. 3:30 PM, 4:00 PM, 5:00 PM
  cleaningRecord: string; // e.g. Cleaned with 70% IPA
  doneBy: string;
  checkedBy: string;
}

export const LafPage: React.FC = () => {
  const { user } = useAuth();

  const [entries, setEntries] = useState<LafEntry[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>("Current Month");
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Staff list
  const defaultStaff = user?.fullName || "Lab Analyst";
  const staffList = ["Lab Analyst", "QC Chemist", "Microbiologist", "Lab Supervisor", defaultStaff].filter(
    (v, i, a) => a.indexOf(v) === i
  );

  // Helper to compute next day (DD-MM-YYYY)
  const getNextDay = (dateStr: string): string => {
    try {
      const parts = dateStr.split(/[-/]/);
      if (parts.length === 3) {
        let d = parseInt(parts[0], 10);
        let m = parseInt(parts[1], 10) - 1;
        let y = parseInt(parts[2], 10);
        if (parts[0].length === 4) {
          // YYYY-MM-DD
          y = parseInt(parts[0], 10);
          m = parseInt(parts[1], 10) - 1;
          d = parseInt(parts[2], 10);
        }
        const dt = new Date(y, m, d);
        dt.setDate(dt.getDate() + 1);
        const nextD = String(dt.getDate()).padStart(2, "0");
        const nextM = String(dt.getMonth() + 1).padStart(2, "0");
        const nextY = dt.getFullYear();
        return `${nextD}-${nextM}-${nextY}`;
      }
    } catch {}
    return dateStr;
  };

  // Helper to compute default End Time according to sample count:
  // sampleCount == 5 -> 4:00 PM
  // sampleCount > 5  -> 5:00 PM
  // sampleCount < 5  -> 3:30 PM
  const calculateDefaultEndTime = (sampleCount: number): string => {
    if (sampleCount === 5) return "04:00 PM";
    if (sampleCount > 5) return "05:00 PM";
    return "03:30 PM";
  };

  // Load from Excel uploaded days or existing cache
  useEffect(() => {
    const cachedDaily = localStorage.getItem("labflow_analyzed_daily");
    const cachedLaf = localStorage.getItem("labflow_laf_entries");

    if (cachedLaf) {
      try {
        setEntries(JSON.parse(cachedLaf));
        const m = localStorage.getItem("labflow_current_month");
        if (m) setSelectedMonth(m);
        return;
      } catch {}
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

        if (days.length > 0) {
          setSelectedMonth(days[0].displayDate.slice(3));

          // Generate one LAF entry per sample date (with date set to next day)
          const gen: LafEntry[] = days.map((d, index) => {
            const nextDayDate = getNextDay(d.displayDate);
            const count = d.total || 1;
            const productNamesJoined = d.sampleNames && d.sampleNames.length > 0
              ? d.sampleNames.join(", ")
              : "Finished Product / Material";

            return {
              id: `laf-${d.date}-${index}`,
              sourceDate: d.displayDate,
              date: nextDayDate, // Next day / second day of test request
              startTime: "02:00 PM", // 2:00 PM starting time
              productName: productNamesJoined,
              batchNo: `B-${nextDayDate.slice(0, 2)}${nextDayDate.slice(3, 5)}`,
              manometerReadingMm: 11, // 11 mm manometer reading
              uvBurningHours: "20 mins", // 20 mins UV burning
              sampleCount: count,
              endTime: calculateDefaultEndTime(count),
              cleaningRecord: "Cleaned with 70% IPA & Ready",
              doneBy: defaultStaff,
              checkedBy: "QC Chemist",
            };
          });

          setEntries(gen);
          localStorage.setItem("labflow_laf_entries", JSON.stringify(gen));
          return;
        }
      } catch (err) {
        console.error(err);
      }
    }

    // Default sample fallback rows
    const fallback: LafEntry[] = [
      {
        id: "laf-sample-1",
        sourceDate: "01-10-2026",
        date: "02-10-2026",
        startTime: "02:00 PM",
        productName: "Purified Water, Cough Syrup Base",
        batchNo: "B-0210",
        manometerReadingMm: 11,
        uvBurningHours: "20 mins",
        sampleCount: 2,
        endTime: "03:30 PM", // < 5 samples -> 3:30 PM
        cleaningRecord: "Cleaned with 70% IPA & Ready",
        doneBy: defaultStaff,
        checkedBy: "QC Chemist",
      },
      {
        id: "laf-sample-2",
        sourceDate: "03-10-2026",
        date: "04-10-2026",
        startTime: "02:00 PM",
        productName: "Syrup Base, Herbal Extract, Water for Injection, Glycerin, Liquid Glucose",
        batchNo: "B-0410",
        manometerReadingMm: 11,
        uvBurningHours: "20 mins",
        sampleCount: 5,
        endTime: "04:00 PM", // == 5 samples -> 4:00 PM
        cleaningRecord: "Cleaned with 70% IPA & Ready",
        doneBy: defaultStaff,
        checkedBy: "QC Chemist",
      },
      {
        id: "laf-sample-3",
        sourceDate: "05-10-2026",
        date: "06-10-2026",
        startTime: "02:00 PM",
        productName: "Lot 101, Lot 102, Lot 103, Lot 104, Lot 105, Lot 106, Lot 107",
        batchNo: "B-0610",
        manometerReadingMm: 11,
        uvBurningHours: "20 mins",
        sampleCount: 7,
        endTime: "05:00 PM", // > 5 samples -> 5:00 PM
        cleaningRecord: "Cleaned with 70% IPA & Ready",
        doneBy: defaultStaff,
        checkedBy: "QC Chemist",
      },
    ];
    setEntries(fallback);
  }, []);

  // Update a field in any row (fully editable at every point)
  const handleUpdateField = (id: string, field: keyof LafEntry, value: any) => {
    setEntries((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, [field]: value };

        // If sample count is edited, re-evaluate default end time automatically
        if (field === "sampleCount") {
          const num = parseInt(value, 10) || 0;
          updated.endTime = calculateDefaultEndTime(num);
        }
        return updated;
      })
    );
  };

  // Add new manual row
  const handleAddRow = () => {
    const today = new Date();
    const dStr = `${String(today.getDate()).padStart(2, "0")}-${String(today.getMonth() + 1).padStart(2, "0")}-${today.getFullYear()}`;
    const newRow: LafEntry = {
      id: `laf-manual-${Date.now()}`,
      sourceDate: dStr,
      date: getNextDay(dStr),
      startTime: "02:00 PM",
      productName: "",
      batchNo: "B-MANUAL",
      manometerReadingMm: 11,
      uvBurningHours: "20 mins",
      sampleCount: 1,
      endTime: "03:30 PM",
      cleaningRecord: "Cleaned with 70% IPA & Ready",
      doneBy: defaultStaff,
      checkedBy: "QC Chemist",
    };
    setEntries((prev) => [...prev, newRow]);
  };

  // Delete a row
  const handleDeleteRow = (id: string) => {
    setEntries((prev) => prev.filter((r) => r.id !== id));
  };

  // Save changes
  const handleSave = () => {
    localStorage.setItem("labflow_laf_entries", JSON.stringify(entries));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 font-sans">
      {/* Official Standard Header from Reference */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-2 text-center relative">
        <div className="text-right text-[11px] font-mono text-gray-600 sm:absolute sm:top-4 sm:right-5 space-y-0.5">
          <div><strong>Format No.:</strong> QC/M/026/F/01</div>
          <div><strong>Ref. SOP No.:</strong> PM/QC/M/026</div>
          <div><strong>Equipment No.:</strong> PM/QC/M/05</div>
        </div>

        <h1 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
          PETLAD MAHAL AROGYA MANDAL PHARMACY
        </h1>
        <p className="text-xs text-gray-500">
          At & Po. Village- Piplata- 387355, Ta.: Nadiad, Dist.: Kheda (Gujarat)
        </p>
        <div className="pt-1">
          <span className="inline-block bg-blue-50 text-blue-900 px-3 py-1 rounded text-sm font-bold border border-blue-200 uppercase tracking-wide">
            Laminar Air Flow - Log Book (Stage 3)
          </span>
        </div>
      </div>

      {/* Workflow Navigation Banner */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            Stage 3 of 7 Laboratory Stages
          </span>
          <p className="text-xs text-gray-600 mt-1">
            <strong>Rules:</strong> Start time: <strong>2:00 PM</strong> | Manometer reading: <strong>11 mm</strong> | UV burning hours: <strong>20 mins</strong>.
            <br />
            <strong>End time logic:</strong> If samples = 5 &rarr; <strong>4:00 PM</strong> | If samples &gt; 5 &rarr; <strong>5:00 PM</strong> | If samples &lt; 5 &rarr; <strong>3:30 PM</strong>.
            <br />
            <strong>Date:</strong> Next day / second day of test request date. All fields are fully editable inline.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/autoclave"
            className="px-3 py-1.5 border border-gray-300 rounded text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            &larr; Step 2: Autoclave
          </Link>
          <button
            onClick={handleAddRow}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded text-xs font-semibold border border-gray-300 transition"
          >
            + Add Extra Row
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold shadow-xs transition"
          >
            {savedSuccess ? "✓ Saved" : "Save LAF Log"}
          </button>
        </div>
      </div>

      {/* Main LAF Log Book Table */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-3.5 border-b border-gray-200 flex flex-wrap justify-between items-center gap-2 bg-gray-50">
          <div>
            <h3 className="text-sm font-bold text-gray-800">
              Laminar Air Flow Operations — {selectedMonth}
            </h3>
            <p className="text-xs text-gray-500">
              Directly editable table. Changes are preserved and audited.
            </p>
          </div>
          <span className="text-xs text-gray-500 bg-white border border-gray-200 px-2.5 py-1 rounded">
            {entries.length} Operational Days
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-xs">
            <thead className="bg-slate-50 text-gray-700 uppercase font-semibold">
              <tr>
                <th className="px-3 py-3 text-left w-28">Date (2nd Day)</th>
                <th className="px-3 py-3 text-left w-28">Start Time</th>
                <th className="px-3 py-3 text-left">Name of Product</th>
                <th className="px-3 py-3 text-left w-24">Batch No.</th>
                <th className="px-3 py-3 text-center w-28">Manometer (mm)</th>
                <th className="px-3 py-3 text-center w-28">UV Burning</th>
                <th className="px-3 py-3 text-center w-20">Samples</th>
                <th className="px-3 py-3 text-center w-28">End Time</th>
                <th className="px-3 py-3 text-left w-36">Cleaning Record</th>
                <th className="px-3 py-3 text-left w-32">Done By</th>
                <th className="px-3 py-3 text-left w-32">Checked By</th>
                <th className="px-2 py-3 text-center w-12">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {entries.map((row) => (
                <tr key={row.id} className="hover:bg-blue-50/20 transition">
                  {/* Date (Next day of test request date) */}
                  <td className="px-3 py-2.5">
                    <input
                      type="text"
                      value={row.date}
                      onChange={(e) => handleUpdateField(row.id, "date", e.target.value)}
                      className="w-full text-xs font-semibold text-gray-900 border border-gray-300 rounded px-1.5 py-1 focus:ring-1 focus:ring-blue-500"
                    />
                    <span className="block text-[10px] text-gray-400 mt-0.5">Req: {row.sourceDate}</span>
                  </td>

                  {/* Start time (Default 2:00 PM) */}
                  <td className="px-3 py-2.5">
                    <input
                      type="text"
                      value={row.startTime}
                      onChange={(e) => handleUpdateField(row.id, "startTime", e.target.value)}
                      className="w-full font-mono text-xs border border-gray-300 rounded px-1.5 py-1 focus:ring-1 focus:ring-blue-500"
                    />
                  </td>

                  {/* Name of Product */}
                  <td className="px-3 py-2.5">
                    <input
                      type="text"
                      value={row.productName}
                      onChange={(e) => handleUpdateField(row.id, "productName", e.target.value)}
                      className="w-full text-xs border border-gray-300 rounded px-2 py-1 font-medium focus:ring-1 focus:ring-blue-500"
                    />
                  </td>

                  {/* Batch No. */}
                  <td className="px-3 py-2.5">
                    <input
                      type="text"
                      value={row.batchNo}
                      onChange={(e) => handleUpdateField(row.id, "batchNo", e.target.value)}
                      className="w-full font-mono text-xs border border-gray-300 rounded px-1.5 py-1 focus:ring-1 focus:ring-blue-500"
                    />
                  </td>

                  {/* Manometer Reading (Default 11 mm) */}
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <input
                        type="number"
                        value={row.manometerReadingMm}
                        onChange={(e) =>
                          handleUpdateField(row.id, "manometerReadingMm", parseFloat(e.target.value) || 0)
                        }
                        className="w-14 text-center font-bold text-blue-700 border border-gray-300 rounded px-1 py-1 text-xs focus:ring-1 focus:ring-blue-500"
                      />
                      <span className="text-[10px] text-gray-500">mm</span>
                    </div>
                  </td>

                  {/* UV Burning Hours (Default 20 mins) */}
                  <td className="px-3 py-2.5 text-center">
                    <input
                      type="text"
                      value={row.uvBurningHours}
                      onChange={(e) => handleUpdateField(row.id, "uvBurningHours", e.target.value)}
                      className="w-20 text-center font-medium border border-gray-300 rounded px-1.5 py-1 text-xs focus:ring-1 focus:ring-blue-500"
                    />
                  </td>

                  {/* Sample Count (Affects End Time) */}
                  <td className="px-3 py-2.5 text-center">
                    <input
                      type="number"
                      min="1"
                      value={row.sampleCount}
                      onChange={(e) => handleUpdateField(row.id, "sampleCount", e.target.value)}
                      className="w-12 text-center font-bold text-gray-800 bg-gray-50 border border-gray-300 rounded px-1 py-1 text-xs focus:ring-1 focus:ring-blue-500"
                    />
                  </td>

                  {/* End Time (Calculated from samples count: <5 -> 3:30 PM, =5 -> 4:00 PM, >5 -> 5:00 PM) */}
                  <td className="px-3 py-2.5 text-center">
                    <input
                      type="text"
                      value={row.endTime}
                      onChange={(e) => handleUpdateField(row.id, "endTime", e.target.value)}
                      className="w-24 text-center font-bold font-mono text-emerald-700 bg-emerald-50/50 border border-emerald-300 rounded px-1.5 py-1 text-xs focus:ring-1 focus:ring-blue-500"
                    />
                  </td>

                  {/* Cleaning Record */}
                  <td className="px-3 py-2.5">
                    <input
                      type="text"
                      value={row.cleaningRecord}
                      onChange={(e) => handleUpdateField(row.id, "cleaningRecord", e.target.value)}
                      className="w-full text-xs border border-gray-300 rounded px-1.5 py-1 text-gray-700 focus:ring-1 focus:ring-blue-500"
                    />
                  </td>

                  {/* Done By */}
                  <td className="px-3 py-2.5">
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

                  {/* Checked By */}
                  <td className="px-3 py-2.5">
                    <select
                      value={row.checkedBy}
                      onChange={(e) => handleUpdateField(row.id, "checkedBy", e.target.value)}
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
            * Format No: QC/M/026/F/01 | Ref SOP: PM/QC/M/026 | Equipment: PM/QC/M/05 | Date is set to next day of test request date.
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold shadow-xs transition"
            >
              {savedSuccess ? "✓ Changes Saved!" : "Save LAF Log"}
            </button>
            <Link
              to="/reports"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold shadow-xs transition"
            >
              Final Review & Downloads &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
