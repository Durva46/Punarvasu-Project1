/**
 * frontend/src/pages/BodPathogenPage.tsx
 *
 * Stage 6: B.O.D. Incubator Log Book for Pathogen (Set Temperature 37° C).
 *
 * Header Format from Reference:
 *  - Header: PETLAD MAHAL AROGYA MANDAL PHARMACY, Piplata
 *  - Title: B.O.D. Incubator Log Book for Pathogen (Set Temperature 37° C)
 *  - Formate No.: QC/M/024/F/01
 *  - Ref. Sop No.: PM/QC/M/024
 *  - Equipment No.: PM/QC/M/02
 *
 * Operational Flow (4 Days per Sample Cycle):
 *  - Day 1:
 *      * Date & Incubation Start Date: Same as LAF Date.
 *      * Name of Product: All sample names registered on that date.
 *      * Media: SCDB.
 *      * NO.OF plats/tubes: Total number of samples (S).
 *      * Incubation End Date: 5 days after Start Date (or next operational step).
 *  - Day 2:
 *      * Date & Incubation Start Date: Next date of LAF.
 *      * Name of Product: All samples registered for that batch.
 *      * Media: 7 specific media rows working commonly for all samples:
 *          1. MacConkey's Broth
 *          2. Mannitol Salt Agar
 *          3. Vogel Johnson Agar
 *          4. Baird Parker Agar
 *          5. Cetrimide Agar
 *          6. Selenite F Broth
 *          7. Tetrathionate Broth
 *      * NO.OF plats/tubes: Same number of tubes used in Media Preparation.
 *  - Day 3 & Day 4:
 *      * Space reserved as placeholders for subsequent sub-culturing / identification steps.
 *
 *  - Cleaning Record: "Everyday cleaning done"
 *  - Done by: Authenticated staff.
 *  - Fully editable inline.
 */

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export interface BodPathogenRow {
  id: string;
  dayPhase: "Day 1" | "Day 2" | "Day 3" | "Day 4";
  date: string; // DD-MM-YYYY
  productName: string;
  media: string;
  batchNo: string;
  platesTubes: number;
  incubationStartDate: string;
  incubationEndDate: string;
  cleaningRecord: string;
  doneBy: string;
}

const DAY_2_MEDIA_LIST = [
  { name: "MacConkey's Broth", calcTubes: (S: number) => (S + 1 + 1 + 1) * 2 },
  { name: "Mannitol Salt Agar", calcTubes: (S: number) => S + 1 + 1 },
  { name: "Vogel Johnson Agar", calcTubes: (S: number) => S + 1 + 1 },
  { name: "Baird Parker Agar", calcTubes: (S: number) => S + 1 + 1 },
  { name: "Cetrimide Agar", calcTubes: (S: number) => S + 1 + 1 },
  { name: "Selenite F Broth", calcTubes: (S: number) => S + 1 + 1 },
  { name: "Tetrathionate Broth", calcTubes: (S: number) => S + 1 + 1 },
];

export const BodPathogenPage: React.FC = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<BodPathogenRow[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>("Current Month");
  const [activeTab, setActiveTab] = useState<"All" | "Day 1" | "Day 2" | "Day 3" | "Day 4">("All");
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const defaultStaff = user?.fullName || "Lab Analyst";
  const staffList = ["Lab Analyst", "QC Chemist", "Microbiologist", "Lab Supervisor", defaultStaff].filter(
    (v, i, a) => a.indexOf(v) === i
  );

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

  const getNextDay = (dateStr: string): string => addDays(dateStr, 1);

  useEffect(() => {
    const cachedBod = localStorage.getItem("labflow_bod_pathogen_entries");
    if (cachedBod) {
      try {
        const parsed = JSON.parse(cachedBod);
        setEntries(parsed);
        const m = localStorage.getItem("labflow_current_month");
        if (m) setSelectedMonth(m);
        return;
      } catch {}
    }

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
          samples?: Array<{
            sampleName: string;
            batchNo: string;
            mfgDate: string;
            expDate: string;
            isWater: boolean;
          }>;
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

          const generated: BodPathogenRow[] = [];

          days.forEach((d, idx) => {
            const S = d.total || 1;
            const allSampleNames = d.sampleNames && d.sampleNames.length > 0
              ? d.sampleNames.join(", ")
              : "Standard Samples";

            // Extract real batch number from uploaded sheet
            const uploadedBatch = d.samples && d.samples.length > 0
              ? d.samples.map((s) => s.batchNo).filter(Boolean).join(", ")
              : "";

            // Day 1 Date = Same date as LAF Date
            const day1Date = lafMap.get(d.displayDate) ||
              (idx + 1 < days.length ? days[idx + 1].displayDate : getNextDay(d.displayDate));
            const day1EndDate = addDays(day1Date, 5);

            // Day 2 Date = Next date of LAF Date
            const day2Date = getNextDay(day1Date);
            const day2EndDate = addDays(day2Date, 5);

            // ── Day 1 Entry ──
            // Same date as LAF, all sample names, SCDB as media, tubes = total number of samples
            generated.push({
              id: `bod-path-d1-${d.date}-${idx}`,
              dayPhase: "Day 1",
              date: day1Date,
              productName: allSampleNames,
              media: "SCDB",
              batchNo: uploadedBatch || `B-${day1Date.slice(0, 2)}${day1Date.slice(3, 5)}-D1`,
              platesTubes: S, // Total number of samples as tubes
              incubationStartDate: day1Date,
              incubationEndDate: day1EndDate,
              cleaningRecord: "Everyday cleaning done",
              doneBy: defaultStaff,
            });

            // ── Day 2 Entries (7 Media working commonly for all samples) ──
            // Date = Next date of LAF, all sample names, tubes = same number of tubes as media preparation
            DAY_2_MEDIA_LIST.forEach((mDef, mIdx) => {
              const tubes = mDef.calcTubes(S);
              generated.push({
                id: `bod-path-d2-${d.date}-${idx}-${mIdx}`,
                dayPhase: "Day 2",
                date: day2Date,
                productName: allSampleNames,
                media: mDef.name,
                batchNo: uploadedBatch || `B-${day2Date.slice(0, 2)}${day2Date.slice(3, 5)}-D2`,
                platesTubes: tubes, // Same as media preparation
                incubationStartDate: day2Date,
                incubationEndDate: day2EndDate,
                cleaningRecord: "Everyday cleaning done",
                doneBy: defaultStaff,
              });
            });

            // ── Day 3 Space Placeholder ──
            generated.push({
              id: `bod-path-d3-${d.date}-${idx}`,
              dayPhase: "Day 3",
              date: addDays(day2Date, 1),
              productName: allSampleNames,
              media: "Selective Sub-culture / Identification (Reserved)",
              batchNo: uploadedBatch || `B-${day2Date.slice(0, 2)}${day2Date.slice(3, 5)}-D3`,
              platesTubes: S,
              incubationStartDate: addDays(day2Date, 1),
              incubationEndDate: addDays(day2Date, 6),
              cleaningRecord: "Everyday cleaning done",
              doneBy: defaultStaff,
            });

            // ── Day 4 Space Placeholder ──
            generated.push({
              id: `bod-path-d4-${d.date}-${idx}`,
              dayPhase: "Day 4",
              date: addDays(day2Date, 2),
              productName: allSampleNames,
              media: "Confirmatory Biochemical Testing (Reserved)",
              batchNo: `B-${day2Date.slice(0, 2)}${day2Date.slice(3, 5)}-D4`,
              platesTubes: S,
              incubationStartDate: addDays(day2Date, 2),
              incubationEndDate: addDays(day2Date, 7),
              cleaningRecord: "Everyday cleaning done",
              doneBy: defaultStaff,
            });
          });

          setEntries(generated);
          localStorage.setItem("labflow_bod_pathogen_entries", JSON.stringify(generated));
          return;
        }
      } catch (e) {
        console.error(e);
      }
    }

    // Default sample fallback
    const fallback: BodPathogenRow[] = [
      {
        id: "bod-path-fb-1",
        dayPhase: "Day 1",
        date: "02-10-2026",
        productName: "Cough Syrup Base, Herbal Extract, Purified Water",
        media: "SCDB",
        batchNo: "B-0210-D1",
        platesTubes: 3,
        incubationStartDate: "02-10-2026",
        incubationEndDate: "07-10-2026",
        cleaningRecord: "Everyday cleaning done",
        doneBy: defaultStaff,
      },
      ...DAY_2_MEDIA_LIST.map((mDef, mIdx) => ({
        id: `bod-path-fb-d2-${mIdx}`,
        dayPhase: "Day 2" as const,
        date: "03-10-2026",
        productName: "Cough Syrup Base, Herbal Extract, Purified Water",
        media: mDef.name,
        batchNo: "B-0310-D2",
        platesTubes: mDef.calcTubes(3),
        incubationStartDate: "03-10-2026",
        incubationEndDate: "08-10-2026",
        cleaningRecord: "Everyday cleaning done",
        doneBy: defaultStaff,
      })),
      {
        id: "bod-path-fb-d3",
        dayPhase: "Day 3",
        date: "04-10-2026",
        productName: "Cough Syrup Base, Herbal Extract, Purified Water",
        media: "Selective Sub-culture / Identification (Reserved)",
        batchNo: "B-0410-D3",
        platesTubes: 3,
        incubationStartDate: "04-10-2026",
        incubationEndDate: "09-10-2026",
        cleaningRecord: "Everyday cleaning done",
        doneBy: defaultStaff,
      },
      {
        id: "bod-path-fb-d4",
        dayPhase: "Day 4",
        date: "05-10-2026",
        productName: "Cough Syrup Base, Herbal Extract, Purified Water",
        media: "Confirmatory Biochemical Testing (Reserved)",
        batchNo: "B-0510-D4",
        platesTubes: 3,
        incubationStartDate: "05-10-2026",
        incubationEndDate: "10-10-2026",
        cleaningRecord: "Everyday cleaning done",
        doneBy: defaultStaff,
      },
    ];
    setEntries(fallback);
  }, []);

  const handleUpdateField = (id: string, field: keyof BodPathogenRow, value: any) => {
    setEntries((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, [field]: value };
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
    const newRow: BodPathogenRow = {
      id: `bod-path-manual-${Date.now()}`,
      dayPhase: "Day 1",
      date: dStr,
      productName: "",
      media: "SCDB",
      batchNo: "B-MANUAL",
      platesTubes: 1,
      incubationStartDate: dStr,
      incubationEndDate: addDays(dStr, 5),
      cleaningRecord: "Everyday cleaning done",
      doneBy: defaultStaff,
    };
    setEntries((prev) => [...prev, newRow]);
  };

  const handleDeleteRow = (id: string) => {
    setEntries((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSave = () => {
    localStorage.setItem("labflow_bod_pathogen_entries", JSON.stringify(entries));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const filteredEntries = activeTab === "All"
    ? entries
    : entries.filter((e) => e.dayPhase === activeTab);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 font-sans">
      {/* Official Standard Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-2 text-center relative">
        <div className="text-right text-[11px] font-mono text-gray-600 sm:absolute sm:top-4 sm:right-5 space-y-0.5">
          <div><strong>Formate No.:</strong> QC/M/024/F/01</div>
          <div><strong>Ref. Sop No.:</strong> PM/QC/M/024</div>
          <div><strong>Equipment No.:</strong> PM/QC/M/02</div>
        </div>

        <h1 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
          PETLAD MAHAL AROGYA MANDAL PHARMACY
        </h1>
        <p className="text-xs text-gray-500 font-medium">Piplata</p>
        <div className="pt-1">
          <span className="inline-block bg-purple-50 text-purple-900 px-3 py-1 rounded text-sm font-bold border border-purple-300 uppercase tracking-wide">
            B.O.D. Incubator Log Book for Pathogen (Set Temperature 37° C)
          </span>
        </div>
      </div>

      {/* Workflow Navigation Banner */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
            Stage 6 of 7 Laboratory Stages (4-Day Testing Protocol)
          </span>
          <p className="text-xs text-gray-600 mt-1">
            <strong>Day 1:</strong> Same date as LAF | All sample names | Media: <strong>SCDB</strong> | Tubes = <strong>Total Samples (S)</strong>.
            <br />
            <strong>Day 2:</strong> Next date of LAF | All sample names | <strong>7 Media</strong> (MacConkey's Broth, MSA, VJA, BPA, Cetrimide, Selenite F, Tetrathionate) | Tubes = <strong>Same as Media Prep</strong>.
            <br />
            <strong>Day 3 & Day 4:</strong> Spaces reserved for identification / sub-culturing. All rows fully editable.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/bod-fungus"
            className="px-3 py-1.5 border border-gray-300 rounded text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            &larr; Stage 5: B.O.D. Fungus
          </Link>
          <button
            onClick={handleAddRow}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded text-xs font-semibold border border-gray-300 transition"
          >
            + Add Extra Row
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-semibold shadow-xs transition"
          >
            {savedSuccess ? "✓ Saved" : "Save Pathogen Log"}
          </button>
        </div>
      </div>

      {/* Day Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <span className="text-xs font-bold text-gray-600 uppercase mr-2">Filter Days:</span>
        {(["All", "Day 1", "Day 2", "Day 3", "Day 4"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1 rounded text-xs font-semibold transition ${
              activeTab === tab
                ? "bg-purple-600 text-white shadow-xs"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Main Table Matching Reference Form */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-3.5 border-b border-gray-200 flex flex-wrap justify-between items-center gap-2 bg-gray-50">
          <div>
            <h3 className="text-sm font-bold text-gray-800">
              B.O.D. Incubator (Pathogen 37° C) — {selectedMonth}
            </h3>
            <p className="text-xs text-gray-500">
              Showing {filteredEntries.length} rows ({activeTab})
            </p>
          </div>
          <span className="text-xs text-gray-500 bg-white border border-gray-200 px-2.5 py-1 rounded">
            {entries.length} Total Pathogen Cycle Steps
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-xs">
            <thead className="bg-slate-50 text-gray-700 uppercase font-semibold">
              <tr>
                <th rowSpan={2} className="px-2.5 py-3 text-center w-16 border-r border-gray-200">Phase</th>
                <th rowSpan={2} className="px-3 py-3 text-left w-28 border-r border-gray-200">Date</th>
                <th rowSpan={2} className="px-3 py-3 text-left border-r border-gray-200">Name of Product</th>
                <th rowSpan={2} className="px-3 py-3 text-left w-36 border-r border-gray-200">Media</th>
                <th rowSpan={2} className="px-3 py-3 text-left w-24 border-r border-gray-200">B.No.</th>
                <th rowSpan={2} className="px-3 py-3 text-center w-24 border-r border-gray-200">NO.OF plats/tubes</th>
                <th colSpan={2} className="px-3 py-1.5 text-center border-b border-r border-gray-200 bg-slate-100">Incubation</th>
                <th rowSpan={2} className="px-3 py-3 text-left w-44 border-r border-gray-200">Cleaning Record</th>
                <th rowSpan={2} className="px-3 py-3 text-left w-32 border-r border-gray-200">Done by</th>
                <th rowSpan={2} className="px-2 py-3 text-center w-12">Action</th>
              </tr>
              <tr>
                <th className="px-3 py-1.5 text-center w-28 border-r border-gray-200 bg-slate-100 font-semibold text-[11px]">Start Date</th>
                <th className="px-3 py-1.5 text-center w-28 border-r border-gray-200 bg-slate-100 font-semibold text-[11px]">End Date (+5d)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredEntries.map((row) => (
                <tr
                  key={row.id}
                  className={`hover:bg-purple-50/20 transition ${
                    row.dayPhase === "Day 1"
                      ? "bg-purple-50/10"
                      : row.dayPhase === "Day 2"
                      ? "bg-blue-50/10"
                      : "bg-gray-50/30"
                  }`}
                >
                  {/* Phase Badge */}
                  <td className="px-2.5 py-2.5 text-center border-r border-gray-100">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        row.dayPhase === "Day 1"
                          ? "bg-purple-100 text-purple-800 border border-purple-200"
                          : row.dayPhase === "Day 2"
                          ? "bg-blue-100 text-blue-800 border border-blue-200"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {row.dayPhase}
                    </span>
                  </td>

                  {/* Date */}
                  <td className="px-3 py-2.5 border-r border-gray-100">
                    <input
                      type="text"
                      value={row.date}
                      onChange={(e) => handleUpdateField(row.id, "date", e.target.value)}
                      className="w-full text-xs font-semibold text-gray-900 border border-gray-300 rounded px-1.5 py-1 focus:ring-1 focus:ring-purple-500"
                    />
                  </td>

                  {/* Name of Product */}
                  <td className="px-3 py-2.5 border-r border-gray-100">
                    <input
                      type="text"
                      value={row.productName}
                      onChange={(e) => handleUpdateField(row.id, "productName", e.target.value)}
                      className="w-full text-xs border border-gray-300 rounded px-2 py-1 font-medium focus:ring-1 focus:ring-purple-500"
                    />
                  </td>

                  {/* Media */}
                  <td className="px-3 py-2.5 border-r border-gray-100">
                    <input
                      type="text"
                      value={row.media}
                      onChange={(e) => handleUpdateField(row.id, "media", e.target.value)}
                      className="w-full text-xs font-semibold text-purple-900 border border-gray-300 rounded px-1.5 py-1 focus:ring-1 focus:ring-purple-500"
                    />
                  </td>

                  {/* B.No. (Batch Number) */}
                  <td className="px-3 py-2.5 border-r border-gray-100">
                    <input
                      type="text"
                      value={row.batchNo}
                      onChange={(e) => handleUpdateField(row.id, "batchNo", e.target.value)}
                      className="w-full font-mono text-xs border border-gray-300 rounded px-1.5 py-1 focus:ring-1 focus:ring-purple-500"
                    />
                  </td>

                  {/* NO.OF plats/tubes */}
                  <td className="px-3 py-2.5 text-center border-r border-gray-100">
                    <input
                      type="number"
                      min="1"
                      value={row.platesTubes}
                      onChange={(e) => handleUpdateField(row.id, "platesTubes", parseInt(e.target.value, 10) || 0)}
                      className="w-14 text-center font-bold text-purple-700 bg-purple-50/50 border border-purple-300 rounded px-1 py-1 text-xs focus:ring-1 focus:ring-purple-500"
                    />
                  </td>

                  {/* Incubation Start Date */}
                  <td className="px-3 py-2.5 text-center border-r border-gray-100 font-mono text-xs">
                    <input
                      type="text"
                      value={row.incubationStartDate}
                      onChange={(e) => handleUpdateField(row.id, "incubationStartDate", e.target.value)}
                      className="w-full text-center text-xs font-semibold text-gray-800 border border-gray-300 rounded px-1 py-1 focus:ring-1 focus:ring-purple-500"
                    />
                  </td>

                  {/* Incubation End Date (+5d) */}
                  <td className="px-3 py-2.5 text-center border-r border-gray-100 font-mono text-xs">
                    <input
                      type="text"
                      value={row.incubationEndDate}
                      onChange={(e) => handleUpdateField(row.id, "incubationEndDate", e.target.value)}
                      className="w-full text-center text-xs font-bold text-purple-800 bg-purple-50/50 border border-purple-300 rounded px-1 py-1 focus:ring-1 focus:ring-purple-500"
                    />
                  </td>

                  {/* Cleaning Record */}
                  <td className="px-3 py-2.5 border-r border-gray-100">
                    <div className="flex items-center gap-1.5 min-w-[160px]">
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                      <input
                        type="text"
                        value={row.cleaningRecord || "Everyday cleaning done"}
                        onChange={(e) => handleUpdateField(row.id, "cleaningRecord", e.target.value)}
                        className="w-full text-xs border border-gray-300 rounded px-2 py-1 text-gray-800 font-medium bg-emerald-50/20 focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                  </td>

                  {/* Done by */}
                  <td className="px-3 py-2.5 border-r border-gray-100">
                    <select
                      value={row.doneBy}
                      onChange={(e) => handleUpdateField(row.id, "doneBy", e.target.value)}
                      className="w-full text-[11px] border border-gray-300 rounded px-1.5 py-1 bg-white focus:ring-1 focus:ring-purple-500"
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
            * Formate No: QC/M/024/F/01 | Ref. Sop No: PM/QC/M/024 | Equipment No: PM/QC/M/02 | Incubation: 37° C (4-Day Pathogen Protocol).
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded font-semibold shadow-xs transition"
            >
              {savedSuccess ? "✓ Changes Saved!" : "Save Pathogen Log"}
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
