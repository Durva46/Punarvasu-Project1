import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";

export interface StoredSheetRecord {
  id: string;
  reportingMonth: string; // e.g. "09-2024" or "September 2024"
  fileName: string;
  uploadedAt: string;
  totalSamples: number;
  waterSamples: number;
  nonWaterSamples: number;
  totalDates: number;
  dailyGroups?: any[];
  status?: string;
  stagesCompleted?: {
    media?: boolean;
    autoclave?: boolean;
    laf?: boolean;
    bodBacteria?: boolean;
    bodFungus?: boolean;
    bodPathogen?: boolean;
    colonyCounter?: boolean;
  };
}

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [sheets, setSheets] = useState<StoredSheetRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteStatus, setDeleteStatus] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Helper to load sheets from backend and localStorage
  const loadSheets = async () => {
    setLoading(true);
    const recordsMap = new Map<string, StoredSheetRecord>();

    // 1. Load locally cached registry
    try {
      const localRegistry = localStorage.getItem("labflow_sheet_registry");
      if (localRegistry) {
        const parsed: StoredSheetRecord[] = JSON.parse(localRegistry);
        parsed.forEach((rec) => recordsMap.set(rec.id, rec));
      }
    } catch (e) {
      console.warn("Could not parse local sheet registry", e);
    }

    // 2. Also check if active analyzed daily exists and is not yet in registry
    try {
      const activeDaily = localStorage.getItem("labflow_analyzed_daily");
      const activeMonth = localStorage.getItem("labflow_current_month");
      const activeTotal = localStorage.getItem("labflow_total_samples");

      if (activeDaily) {
        const parsedDaily = JSON.parse(activeDaily);
        if (Array.isArray(parsedDaily) && parsedDaily.length > 0) {
          const autoId = `sheet-${activeMonth || "active"}`;
          if (!recordsMap.has(autoId)) {
            const water = parsedDaily.reduce((acc, curr) => acc + (curr.water || 0), 0);
            const nonWater = parsedDaily.reduce((acc, curr) => acc + (curr.nonWater || 0), 0);
            const total = parsedDaily.reduce((acc, curr) => acc + (curr.total || 0), 0);
            const autoRec: StoredSheetRecord = {
              id: autoId,
              reportingMonth: activeMonth || (parsedDaily[0].displayDate ? parsedDaily[0].displayDate.slice(3) : "Current"),
              fileName: localStorage.getItem("labflow_active_filename") || "Current Active Intake Sheet.xlsx",
              uploadedAt: new Date().toISOString(),
              totalSamples: Number(activeTotal) || total,
              waterSamples: water,
              nonWaterSamples: nonWater,
              totalDates: parsedDaily.length,
              dailyGroups: parsedDaily,
              status: "ACTIVE",
              stagesCompleted: {
                media: true,
                autoclave: true,
                laf: true,
                bodBacteria: true,
                bodFungus: true,
                bodPathogen: true,
                colonyCounter: true,
              },
            };
            recordsMap.set(autoId, autoRec);
          }
        }
      }
    } catch (e) {
      console.warn("Error synthesizing active sheet record", e);
    }

    // 3. Fetch from backend /api/v1/imports if available
    try {
      const backendReports = await apiFetch<any[]>("/api/v1/imports");
      if (Array.isArray(backendReports)) {
        backendReports.forEach((rep) => {
          if (!recordsMap.has(rep.id)) {
            recordsMap.set(rep.id, {
              id: rep.id,
              reportingMonth: rep.reportingMonth || "Unknown",
              fileName: rep.fileName || `Monthly-Sheet-${rep.id}.xlsx`,
              uploadedAt: rep.createdAt || new Date().toISOString(),
              totalSamples: rep.validRows || rep.totalRows || 0,
              waterSamples: 0,
              nonWaterSamples: rep.validRows || 0,
              totalDates: rep.dailyCounts?.length || 0,
              status: rep.status || "COMPLETED",
              dailyGroups: rep.dailyCounts,
            });
          }
        });
      }
    } catch {
      // Backend not running / offline mode: rely on client-side storage
    }

    const list = Array.from(recordsMap.values()).sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );

    setSheets(list);
    // Sync back to localStorage
    localStorage.setItem("labflow_sheet_registry", JSON.stringify(list));
    setLoading(false);
  };

  useEffect(() => {
    loadSheets();
  }, []);

  // Handle switching active sheet
  const handleSelectSheet = (sheet: StoredSheetRecord) => {
    if (sheet.dailyGroups && sheet.dailyGroups.length > 0) {
      localStorage.setItem("labflow_analyzed_daily", JSON.stringify(sheet.dailyGroups));
      localStorage.setItem("labflow_total_samples", String(sheet.totalSamples));
      localStorage.setItem("labflow_current_month", sheet.reportingMonth);
      localStorage.setItem("labflow_active_filename", sheet.fileName);
      localStorage.setItem("labflow_selected_sheet_id", sheet.id);
    }
    navigate("/imports");
  };

  // Handle Deleting a Sheet Record
  const handleDeleteSheet = async (sheetId: string) => {
    try {
      setDeleteStatus("Deleting sheet record...");

      // 1. Call backend delete if it's a backend record
      try {
        await apiFetch(`/api/v1/imports/${sheetId}`, { method: "DELETE" });
      } catch (e) {
        console.warn("Backend delete skipped or offline:", e);
      }

      // 2. Remove from local list and storage
      const updated = sheets.filter((s) => s.id !== sheetId);
      setSheets(updated);
      localStorage.setItem("labflow_sheet_registry", JSON.stringify(updated));

      // 3. If currently active sheet was deleted, clean or clear active state
      const currentSelected = localStorage.getItem("labflow_selected_sheet_id");
      if (currentSelected === sheetId || sheets.length <= 1) {
        localStorage.removeItem("labflow_analyzed_daily");
        localStorage.removeItem("labflow_total_samples");
        localStorage.removeItem("labflow_current_month");
        localStorage.removeItem("labflow_active_filename");
        localStorage.removeItem("labflow_selected_sheet_id");
      }

      setDeleteConfirmId(null);
      setDeleteStatus("Sheet record deleted successfully.");
      setTimeout(() => setDeleteStatus(null), 3000);
    } catch (err: any) {
      console.error("Delete error:", err);
      setDeleteStatus(`Failed to delete: ${err.message || "Unknown error"}`);
    }
  };

  // Filter sheets by search query (month or filename)
  const filteredSheets = sheets.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return s.reportingMonth.toLowerCase().includes(q) || s.fileName.toLowerCase().includes(q);
  });

  // Calculate summary metrics across all records
  const totalUploadedBatches = sheets.length;
  const grandTotalSamples = sheets.reduce((sum, s) => sum + s.totalSamples, 0);
  const grandTotalDates = sheets.reduce((sum, s) => sum + s.totalDates, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 font-sans">
      {/* Page Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
              Overview & Reports
            </span>
            <span className="text-xs text-gray-500">Petlad Mahal Arogya Mandal Pharmacy</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Laboratory Process Dashboard</h1>
          <p className="text-sm text-gray-600 mt-0.5">
            Monitor all uploaded Excel sheets, monthly test request records, and complete 7-stage workflow statuses.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/imports"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-md shadow-sm transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Upload New Excel Sheet
          </Link>
          <Link
            to="/reports"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-md transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Final Reports
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Uploaded Sheets</div>
          <div className="mt-2 text-3xl font-extrabold text-blue-600">{totalUploadedBatches}</div>
          <div className="text-xs text-gray-500 mt-1">Monthly batch records archived</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Cumulative Sample Count</div>
          <div className="mt-2 text-3xl font-extrabold text-emerald-600">{grandTotalSamples}</div>
          <div className="text-xs text-gray-500 mt-1">Total samples across all uploads</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Active Test Dates</div>
          <div className="mt-2 text-3xl font-extrabold text-indigo-600">{grandTotalDates}</div>
          <div className="text-xs text-gray-500 mt-1">Registration dates processed</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Full Workflow Stages</div>
          <div className="mt-2 text-3xl font-extrabold text-purple-600">7 Stages</div>
          <div className="text-xs text-gray-500 mt-1">Media, Autoclave, LAF, BOD (3), Colony</div>
        </div>
      </div>

      {/* Delete Feedback Notification */}
      {deleteStatus && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-md flex items-center justify-between">
          <span>{deleteStatus}</span>
          <button onClick={() => setDeleteStatus(null)} className="text-emerald-600 font-bold hover:text-emerald-900">&times;</button>
        </div>
      )}

      {/* Main Table: Uploaded Sheets & Month-Wise Process Records */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">Uploaded Sheet Reports & Month-Wise Records</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Select any monthly sheet to inspect its daily sample breakdown, or launch right into the 7-stage workflow.
            </p>
          </div>

          <div className="w-full sm:w-72">
            <input
              type="text"
              placeholder="Search month or file name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500">Loading sheets registry...</div>
        ) : filteredSheets.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-gray-800">No Uploaded Sheet Records Found</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Upload your monthly lab Excel sheet to track media calculations, sterilization logs, and incubation reports.
            </p>
            <Link
              to="/imports"
              className="inline-flex items-center px-4 py-2 border border-transparent text-xs font-semibold rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition"
            >
              Upload Excel Sheet Now
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-gray-50 text-gray-700 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">Reporting Month</th>
                  <th className="px-4 py-3 text-left">Excel File Name</th>
                  <th className="px-4 py-3 text-center">Total Samples ($S$)</th>
                  <th className="px-4 py-3 text-center">Water ($W$) / Non-Water ($N$)</th>
                  <th className="px-4 py-3 text-center">Dates Count</th>
                  <th className="px-4 py-3 text-left">7-Stage Workflow Progress</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredSheets.map((sheet) => {
                  const isConfirmingDelete = deleteConfirmId === sheet.id;

                  return (
                    <tr key={sheet.id} className="hover:bg-blue-50/40 transition">
                      {/* Reporting Month */}
                      <td className="px-4 py-3 font-bold text-gray-900 whitespace-nowrap">
                        <span className="px-2 py-1 rounded bg-slate-100 text-slate-800 font-mono text-xs">
                          {sheet.reportingMonth}
                        </span>
                        <div className="text-[11px] text-gray-400 font-normal mt-0.5">
                          Uploaded: {new Date(sheet.uploadedAt).toLocaleDateString()}
                        </div>
                      </td>

                      {/* File Name */}
                      <td className="px-4 py-3 text-gray-700 max-w-xs truncate" title={sheet.fileName}>
                        <div className="font-medium text-gray-900">{sheet.fileName}</div>
                        <span className="text-[10px] text-emerald-600 font-semibold uppercase">Parsed & Verified</span>
                      </td>

                      {/* Total Samples */}
                      <td className="px-4 py-3 text-center whitespace-nowrap font-bold text-blue-600">
                        {sheet.totalSamples}
                      </td>

                      {/* Water / Non-water */}
                      <td className="px-4 py-3 text-center whitespace-nowrap text-gray-600">
                        <span className="text-cyan-700 font-semibold">{sheet.waterSamples} Water</span>
                        <span className="mx-1 text-gray-400">/</span>
                        <span className="text-gray-800 font-semibold">{sheet.nonWaterSamples} Non-Water</span>
                      </td>

                      {/* Dates Count */}
                      <td className="px-4 py-3 text-center whitespace-nowrap text-gray-700">
                        {sheet.totalDates > 0 ? `${sheet.totalDates} Days` : "Active"}
                      </td>

                      {/* 7-Stage Process Workflow Badges */}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1">
                          <Link
                            to="/media"
                            onClick={() => handleSelectSheet(sheet)}
                            className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800 hover:bg-blue-200"
                            title="Step 1: Media Preparation"
                          >
                            1. Media
                          </Link>
                          <Link
                            to="/autoclave"
                            onClick={() => handleSelectSheet(sheet)}
                            className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                            title="Step 2: Autoclave Log"
                          >
                            2. Autoclave
                          </Link>
                          <Link
                            to="/laf"
                            onClick={() => handleSelectSheet(sheet)}
                            className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 text-indigo-800 hover:bg-indigo-200"
                            title="Stage 3: LAF Log Book"
                          >
                            3. LAF
                          </Link>
                          <Link
                            to="/bod-bacteria"
                            onClick={() => handleSelectSheet(sheet)}
                            className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 hover:bg-amber-200"
                            title="Stage 4: BOD Bacteria 30-35°C"
                          >
                            4. BOD-Bact
                          </Link>
                          <Link
                            to="/bod-fungus"
                            onClick={() => handleSelectSheet(sheet)}
                            className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-100 text-orange-800 hover:bg-orange-200"
                            title="Stage 5: BOD Fungus 20-25°C"
                          >
                            5. BOD-Fung
                          </Link>
                          <Link
                            to="/bod-pathogen"
                            onClick={() => handleSelectSheet(sheet)}
                            className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-800 hover:bg-rose-200"
                            title="Stage 6: BOD Pathogen 37°C"
                          >
                            6. BOD-Path
                          </Link>
                          <Link
                            to="/colony-counter"
                            onClick={() => handleSelectSheet(sheet)}
                            className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-800 hover:bg-purple-200"
                            title="Stage 7: Colony Counter"
                          >
                            7. Colony
                          </Link>
                        </div>
                      </td>

                      {/* Actions: View / Delete */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {isConfirmingDelete ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => handleDeleteSheet(sheet.id)}
                              className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-bold shadow-xs transition"
                            >
                              Confirm Delete
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-[11px] font-semibold transition"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => handleSelectSheet(sheet)}
                              className="px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded border border-blue-200 transition"
                            >
                              View / Open Sheet &rarr;
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(sheet.id)}
                              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition"
                              title="Delete sheet record"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Workflow Navigation Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h4 className="text-sm font-bold text-gray-900 mb-1">Step 1 & 2: Media & Sterilization</h4>
          <p className="text-xs text-gray-500 mb-3">
            Calculate media tube quantities ($T$), deduct from 500g container stock balances, and generate autoclave cycles.
          </p>
          <div className="flex gap-2">
            <Link to="/media" className="text-xs font-semibold text-blue-600 hover:underline">Media Prep &rarr;</Link>
            <span className="text-gray-300">|</span>
            <Link to="/autoclave" className="text-xs font-semibold text-blue-600 hover:underline">Autoclave Log &rarr;</Link>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h4 className="text-sm font-bold text-gray-900 mb-1">Stages 3 to 6: Incubation Logs</h4>
          <p className="text-xs text-gray-500 mb-3">
            Laminar Air Flow (LAF) operation and B.O.D. incubators at 30-35°C, 20-25°C, and 37°C pathogen selective media.
          </p>
          <div className="flex gap-2">
            <Link to="/laf" className="text-xs font-semibold text-blue-600 hover:underline">LAF &rarr;</Link>
            <span className="text-gray-300">|</span>
            <Link to="/bod-bacteria" className="text-xs font-semibold text-blue-600 hover:underline">B.O.D. Incubation &rarr;</Link>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h4 className="text-sm font-bold text-gray-900 mb-1">Stage 7 & Review Downloads</h4>
          <p className="text-xs text-gray-500 mb-3">
            Colony Counter Log Book with B.O.D. end date mapping, audit checklists, and PDF/Excel regulatory report packages.
          </p>
          <div className="flex gap-2">
            <Link to="/colony-counter" className="text-xs font-semibold text-blue-600 hover:underline">Colony Counter &rarr;</Link>
            <span className="text-gray-300">|</span>
            <Link to="/reports" className="text-xs font-semibold text-blue-600 hover:underline">Download Reports &rarr;</Link>
          </div>
        </div>
      </div>
    </div>
  );
};
