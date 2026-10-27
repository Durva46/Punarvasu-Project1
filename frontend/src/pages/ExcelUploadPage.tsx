import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { apiFetch } from "../lib/api";

export interface DailySampleGroup {
  date: string; // YYYY-MM-DD or DD-MM-YYYY
  displayDate: string;
  total: number; // S
  water: number; // W
  nonWater: number; // N
  sampleNames: string[];
}

interface ImportSummary {
  id: string;
  reportingMonth: string;
  fileName: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  status: string;
  createdAt: string;
  dailyCounts?: any[];
}

export const ExcelUploadPage: React.FC = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [recentReports, setRecentReports] = useState<ImportSummary[]>([]);
  const [activeReport, setActiveReport] = useState<ImportSummary | null>(null);

  // Client-side parsed & analyzed daily groups
  const [analyzedDaily, setAnalyzedDaily] = useState<DailySampleGroup[]>([]);
  const [totalParsedSamples, setTotalParsedSamples] = useState<number>(0);
  const [filterDate, setFilterDate] = useState<string>("");
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  // Helper to format Date to DD-MM-YYYY
  const formatDMY = (d: Date): string => {
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Helper to parse date from string or number (Excel serial)
  const parseExcelDate = (val: any): Date | null => {
    if (!val) return null;
    if (val instanceof Date && !isNaN(val.getTime())) return val;
    if (typeof val === "number") {
      // Excel serial date to JS Date
      const parsed = new Date((val - 25569) * 86400 * 1000);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    if (typeof val === "string") {
      const trimmed = val.trim();
      // Test common formats DD/MM/YYYY or DD-MM-YYYY
      const parts = trimmed.split(/[/.-]/);
      if (parts.length === 3) {
        if (parts[0].length <= 2 && parts[1].length <= 2 && parts[2].length === 4) {
          const d = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          const y = parseInt(parts[2], 10);
          const dateObj = new Date(y, m, d);
          if (!isNaN(dateObj.getTime())) return dateObj;
        }
      }
      const parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return null;
  };

  // Client-side Excel parsing & analysis engine
  const analyzeExcelFile = async (fileToAnalyze: File) => {
    try {
      const buffer = await fileToAnalyze.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        throw new Error("The Excel file has no worksheets.");
      }
      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      if (rawRows.length === 0) {
        throw new Error("The selected Excel sheet contains no rows.");
      }

      // Detect header columns dynamically
      const sampleKeys = ["sample name", "samplename", "name of sample", "product", "material"];
      const dateKeys = ["test request date", "date", "registration date", "request date", "received date", "sampling date"];
      const idKeys = ["ar number", "ar no", "sample id", "arnumber", "identifier", "sample identifier"];

      // Find best matched keys from first row keys
      const allRowKeys = Object.keys(rawRows[0] || {});
      const findKey = (candidates: string[]): string | undefined => {
        return allRowKeys.find((k) => {
          const lower = k.toLowerCase().trim();
          return candidates.some((c) => lower === c || lower.includes(c));
        });
      };

      const sampleNameKey = findKey(sampleKeys) || "Sample Name";
      const dateKey = findKey(dateKeys) || "Test Request Date";
      const idKey = findKey(idKeys) || "AR Number";

      // Group samples date-wise
      const dateMap = new Map<string, { displayDate: string; sampleNames: string[]; waterCount: number; nonWaterCount: number }>();
      let validCount = 0;

      for (const row of rawRows) {
        const rawDate = row[dateKey];
        const rawName = String(row[sampleNameKey] || "").trim();
        const rawId = String(row[idKey] || "").trim();

        // Check if row has valid content
        if (!rawDate && !rawName && !rawId) continue;

        const dateObj = parseExcelDate(rawDate);
        const isoDateKey = dateObj ? dateObj.toISOString().slice(0, 10) : "Undated";
        const displayDate = dateObj ? formatDMY(dateObj) : "Undated";

        const sampleDisplayName = rawName || rawId || "Unnamed Sample";
        const isWater = rawName.toLowerCase().includes("water");

        if (!dateMap.has(isoDateKey)) {
          dateMap.set(isoDateKey, {
            displayDate,
            sampleNames: [],
            waterCount: 0,
            nonWaterCount: 0,
          });
        }

        const group = dateMap.get(isoDateKey)!;
        group.sampleNames.push(sampleDisplayName);
        if (isWater) {
          group.waterCount++;
        } else {
          group.nonWaterCount++;
        }
        validCount++;
      }

      // Convert Map to sorted array
      const sortedDates = Array.from(dateMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([isoDate, data]) => ({
          date: isoDate,
          displayDate: data.displayDate,
          total: data.sampleNames.length,
          water: data.waterCount,
          nonWater: data.nonWaterCount,
          sampleNames: data.sampleNames,
        }));

      setAnalyzedDaily(sortedDates);
      setTotalParsedSamples(validCount);

      // Save analyzed data locally for workflow continuity (Steps 1 & 2)
      localStorage.setItem("labflow_analyzed_daily", JSON.stringify(sortedDates));
      localStorage.setItem("labflow_total_samples", String(validCount));
      if (sortedDates.length > 0) {
        localStorage.setItem("labflow_current_month", sortedDates[0].displayDate.slice(3));
      }

      return sortedDates;
    } catch (err: any) {
      console.error("Excel analysis error:", err);
      throw new Error(err.message || "Could not parse or analyze the Excel sheet.");
    }
  };

  // Fetch list of previously uploaded reports
  const fetchReports = async () => {
    try {
      const data = await apiFetch<ImportSummary[]>("/api/v1/imports");
      setRecentReports(data);
      if (data.length > 0) {
        setActiveReport(data[0]);
      }
    } catch (err: any) {
      // Backend may be offline or in standalone frontend mode; fall back gracefully to local storage
      const cached = localStorage.getItem("labflow_analyzed_daily");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setAnalyzedDaily(parsed);
          setTotalParsedSamples(
            parsed.reduce((acc: number, curr: any) => acc + (curr.total || 0), 0)
          );
        } catch {}
      }
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = e.target.files[0];
      setFile(selected);
      setUploadError(null);

      // Pre-analyze locally immediately
      try {
        await analyzeExcelFile(selected);
      } catch (err: any) {
        setUploadError(err.message);
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setUploadError("Please select an Excel file (.xlsx or .xls) to upload.");
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      // Step 1: Ensure local analysis is complete
      const analyzed = await analyzeExcelFile(file);

      // Step 2: Attempt sync with backend if online
      const formData = new FormData();
      formData.append("file", file);
      const token = localStorage.getItem("auth_token") || "";
      const baseUrl = ((import.meta as any).env?.VITE_API_BASE_URL || "").replace(/\/$/, "");

      try {
        const res = await fetch(`${baseUrl}/api/v1/imports/upload`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });

        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            setActiveReport(json.data);
          }
        }
      } catch (backendError) {
        // Even if server is unreachable, local analysis is ready
        console.warn("Backend not reachable; proceeding in offline mode:", backendError);
      }

      // Step 3: Set active report state from local analysis
      if (analyzed && analyzed.length > 0) {
        setActiveReport({
          id: `local-${Date.now()}`,
          fileName: file.name,
          reportingMonth: analyzed[0].displayDate.slice(3),
          totalRows: totalParsedSamples,
          validRows: totalParsedSamples,
          invalidRows: 0,
          status: "ANALYZED",
          createdAt: new Date().toISOString(),
        });
      }
    } catch (err: any) {
      setUploadError(err.message || "An error occurred while uploading.");
    } finally {
      setUploading(false);
    }
  };

  const proceedToMediaPrep = (date?: string) => {
    if (date) {
      localStorage.setItem("labflow_selected_date", date);
    }
    navigate("/media");
  };

  const filteredDaily = analyzedDaily.filter((g) =>
    filterDate ? g.displayDate.includes(filterDate) || g.date.includes(filterDate) : true
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans">
      {/* Workflow Navigation Banner */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            Workflow: Excel Upload & Analysis
          </span>
          <h1 className="text-xl font-bold text-gray-900 mt-1">Monthly Sample Excel Intake & Analysis</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Parses monthly test request sheets date-wise. Calculates total daily samples ($S$), extracts all sample names, and separates water ($W$) vs non-water ($N$) to feed Step 1 (Media Preparation) and Step 2 (Autoclave Log Book).
          </p>
        </div>

        {analyzedDaily.length > 0 && (
          <button
            onClick={() => proceedToMediaPrep()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-semibold rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition"
          >
            Continue to Step 1: Media Preparation &rarr;
          </button>
        )}
      </div>

      {/* Upload Box */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-sm font-bold text-gray-800 mb-2 uppercase tracking-wide">
          Upload Monthly Sample Log (.xlsx / .xls)
        </h2>
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileChange}
              className="block w-full sm:w-auto text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            />
            <button
              type="submit"
              disabled={!file || uploading}
              className="inline-flex items-center px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition shadow-sm"
            >
              {uploading ? "Analyzing Sheet..." : "Analyze & Extract Samples"}
            </button>
          </div>
          {uploadError && (
            <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded border border-red-200">
              {uploadError}
            </p>
          )}
        </form>
      </div>

      {/* Extracted Analysis Overview */}
      {analyzedDaily.length > 0 && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
              <span className="text-xs text-gray-500 font-medium">Reporting Period</span>
              <p className="text-lg font-bold text-gray-900">
                {analyzedDaily[0]?.displayDate.slice(3) || "Current Month"}
              </p>
              <span className="text-[11px] text-gray-400">
                {analyzedDaily.length} sample dates found
              </span>
            </div>
            <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
              <span className="text-xs text-gray-500 font-medium">Total Samples Analyzed ($S$)</span>
              <p className="text-lg font-bold text-blue-600">{totalParsedSamples}</p>
              <span className="text-[11px] text-gray-400">From uploaded monthly workbook</span>
            </div>
            <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
              <span className="text-xs text-gray-500 font-medium">Water Samples ($W$)</span>
              <p className="text-lg font-bold text-emerald-600">
                {analyzedDaily.reduce((acc, curr) => acc + curr.water, 0)}
              </p>
              <span className="text-[11px] text-gray-400">Requires R2A Agar</span>
            </div>
            <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
              <span className="text-xs text-gray-500 font-medium">Non-Water Samples ($N$)</span>
              <p className="text-lg font-bold text-amber-600">
                {analyzedDaily.reduce((acc, curr) => acc + curr.nonWater, 0)}
              </p>
              <span className="text-[11px] text-gray-400">Raw materials / Finished products</span>
            </div>
          </div>

          {/* Date-wise Sample Analysis Table with Sample Names */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex flex-wrap justify-between items-center gap-3 bg-gray-50">
              <div>
                <h3 className="text-sm font-bold text-gray-800">Date-Wise Sample Analysis & Name Breakdown</h3>
                <p className="text-xs text-gray-500">
                  Every date displays: Total sample count ($S$), list of all sample names per day, water samples ($W$), and non-water samples ($N$).
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Filter by date (DD-MM-YYYY)..."
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="px-3 py-1.5 text-xs border border-gray-300 rounded shadow-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
                <span className="text-xs text-gray-600 bg-white border border-gray-200 px-2.5 py-1 rounded font-medium">
                  {filteredDaily.length} Dates
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-gray-600 w-36">Date</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-600 w-28">
                      Total Samples (S)
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-600">
                      Sample Names Per Day
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-emerald-700 w-32">
                      Water Samples (W)
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-amber-700 w-32">
                      Non-Water Samples (N)
                    </th>
                    <th className="px-6 py-3 text-right font-semibold text-gray-600 w-36">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredDaily.map((row) => {
                    const isExpanded = expandedDate === row.date;
                    const previewNames = row.sampleNames.slice(0, 3);
                    const remainingCount = row.sampleNames.length - 3;

                    return (
                      <tr key={row.date} className="hover:bg-blue-50/30 transition">
                        {/* Date */}
                        <td className="px-6 py-4 font-bold text-gray-900 whitespace-nowrap">
                          {row.displayDate}
                        </td>

                        {/* Total Count S */}
                        <td className="px-4 py-4 text-center">
                          <span className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-bold bg-blue-100 text-blue-800 rounded-full">
                            {row.total}
                          </span>
                        </td>

                        {/* Sample Names per day with water indicator */}
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex flex-wrap gap-1.5">
                              {(isExpanded ? row.sampleNames : previewNames).map((name, i) => {
                                const isW = name.toLowerCase().includes("water");
                                return (
                                  <span
                                    key={i}
                                    className={`inline-flex items-center text-xs px-2 py-0.5 rounded border ${
                                      isW
                                        ? "bg-blue-50 text-blue-700 border-blue-200 font-medium"
                                        : "bg-gray-50 text-gray-700 border-gray-200"
                                    }`}
                                  >
                                    {name}
                                    {isW && (
                                      <span className="ml-1 text-[10px] text-blue-500 font-bold" title="Water Sample">
                                        (W)
                                      </span>
                                    )}
                                  </span>
                                );
                              })}
                            </div>
                            {remainingCount > 0 && (
                              <button
                                type="button"
                                onClick={() => setExpandedDate(isExpanded ? null : row.date)}
                                className="text-[11px] text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                              >
                                {isExpanded ? "Show fewer samples ▲" : `+${remainingCount} more samples ▼`}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Water count W */}
                        <td className="px-4 py-4 text-center">
                          <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
                            {row.water}
                          </span>
                        </td>

                        {/* Non-water count N */}
                        <td className="px-4 py-4 text-center">
                          <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 rounded">
                            {row.nonWater}
                          </span>
                        </td>

                        {/* Action: Proceed to Media Preparation */}
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => proceedToMediaPrep(row.date)}
                            className="inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded transition shadow-2xs"
                          >
                            Prepare Media &rarr;
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Available Uploads History */}
      {recentReports.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
            Available Uploaded Records
          </h3>
          <div className="flex flex-wrap gap-2">
            {recentReports.map((r) => (
              <button
                key={r.id}
                type="button"
                className={`px-3 py-1.5 rounded text-xs font-medium border transition ${
                  activeReport?.id === r.id
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                }`}
              >
                {r.reportingMonth} ({r.validRows} samples)
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
