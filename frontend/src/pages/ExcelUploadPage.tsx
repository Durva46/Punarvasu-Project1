import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";

interface DailyCount {
  date: string;
  total: number;
  water: number;
  nonWater: number;
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
  dailyCounts?: DailyCount[];
}

export const ExcelUploadPage: React.FC = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [recentReports, setRecentReports] = useState<ImportSummary[]>([]);
  const [loadingReports, setLoadingReports] = useState<boolean>(true);
  const [activeReport, setActiveReport] = useState<ImportSummary | null>(null);
  const [dailyCounts, setDailyCounts] = useState<DailyCount[]>([]);
  const [loadingCounts, setLoadingCounts] = useState<boolean>(false);

  // Fetch list of uploaded reports
  const fetchReports = async () => {
    try {
      setLoadingReports(true);
      const data = await apiFetch<ImportSummary[]>("/api/v1/imports");
      setRecentReports(data);
      if (data.length > 0) {
        selectReport(data[0]);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const selectReport = async (report: ImportSummary) => {
    setActiveReport(report);
    localStorage.setItem("labflow_current_report_id", report.id);
    localStorage.setItem("labflow_current_month", report.reportingMonth);
    try {
      setLoadingCounts(true);
      const counts = await apiFetch<DailyCount[]>(`/api/v1/imports/${report.id}/daily-counts`);
      setDailyCounts(counts);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingCounts(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setUploadError(null);
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
      const formData = new FormData();
      formData.append("file", file);

      // Upload using fetch
      const token = localStorage.getItem("auth_token") || "";
      const baseUrl = import.meta.env.VITE_API_BASE_URL || "";
      const res = await fetch(`${baseUrl}/api/v1/imports/upload`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.message || "Failed to upload and parse Excel file");
      }

      setFile(null);
      // Refresh reports list
      await fetchReports();
      if (json.data) {
        selectReport(json.data);
      }
    } catch (err: any) {
      setUploadError(err.message || "An error occurred while uploading.");
    } finally {
      setUploading(false);
    }
  };

  const proceedToMediaPrep = (date?: string) => {
    if (activeReport) {
      localStorage.setItem("labflow_current_report_id", activeReport.id);
      localStorage.setItem("labflow_current_month", activeReport.reportingMonth);
      if (date) {
        localStorage.setItem("labflow_selected_date", date);
      }
    }
    navigate("/media");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Workflow Navigation Banner */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            Step 1 of Workflow: Monthly Excel Intake
          </span>
          <h1 className="text-xl font-bold text-gray-900 mt-1">Monthly Sample Excel Intake & Analysis</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Upload the monthly sample log spreadsheet. The system extracts registration dates and per-day sample counts ($S, W, N$) which automatically feed Stage 1 (Media Preparation) and Stage 2 (Autoclave Log Book).
          </p>
        </div>

        {activeReport && (
          <button
            onClick={() => proceedToMediaPrep()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition"
          >
            Continue to Media Preparation &rarr;
          </button>
        )}
      </div>

      {/* Upload Box */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900 mb-2">Upload Monthly Sample Log (.xlsx / .xls)</h2>
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileChange}
              className="block w-full sm:w-auto text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            />
            <button
              type="submit"
              disabled={!file || uploading}
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {uploading ? "Extracting Data..." : "Upload & Extract Samples"}
            </button>
          </div>
          {uploadError && (
            <p className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">{uploadError}</p>
          )}
        </form>
      </div>

      {/* Extracted Data Overview */}
      {activeReport && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
              <span className="text-xs text-gray-500 font-medium">Reporting Month</span>
              <p className="text-lg font-bold text-gray-900">{activeReport.reportingMonth}</p>
              <span className="text-[11px] text-gray-400">{activeReport.fileName}</span>
            </div>
            <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
              <span className="text-xs text-gray-500 font-medium">Total Samples Extracted</span>
              <p className="text-lg font-bold text-blue-600">{activeReport.validRows}</p>
              <span className="text-[11px] text-gray-400">From {activeReport.totalRows} sheet rows</span>
            </div>
            <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
              <span className="text-xs text-gray-500 font-medium">Dates with Samples</span>
              <p className="text-lg font-bold text-gray-900">{dailyCounts.length}</p>
              <span className="text-[11px] text-gray-400">Distinct test dates</span>
            </div>
            <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm flex flex-col justify-between">
              <span className="text-xs text-gray-500 font-medium">Next Stage Ready</span>
              <button
                onClick={() => proceedToMediaPrep()}
                className="mt-2 w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold shadow-sm transition"
              >
                Transfer to Media Prep &rarr;
              </button>
            </div>
          </div>

          {/* Daily Sample Counts Table */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="text-sm font-bold text-gray-800">Extracted Daily Sample Counts</h3>
                <p className="text-xs text-gray-500">
                  Sample count per day ($S$), Water samples ($W$), and Non-water ($N$). Select a date to proceed to Media Preparation.
                </p>
              </div>
              <span className="text-xs text-gray-500 bg-white border border-gray-200 px-2.5 py-1 rounded">
                {dailyCounts.length} active dates
              </span>
            </div>

            {loadingCounts ? (
              <div className="p-8 text-center text-sm text-gray-500">Loading daily breakdown...</div>
            ) : dailyCounts.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">No sample dates found in this report.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold text-gray-600">Sample Date</th>
                      <th className="px-6 py-3 text-center font-semibold text-gray-600">Total Samples (S)</th>
                      <th className="px-6 py-3 text-center font-semibold text-gray-600">Water Samples (W)</th>
                      <th className="px-6 py-3 text-center font-semibold text-gray-600">Non-Water (N)</th>
                      <th className="px-6 py-3 text-right font-semibold text-gray-600">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {dailyCounts.map((row) => (
                      <tr key={row.date} className="hover:bg-blue-50/40 transition">
                        <td className="px-6 py-3 font-medium text-gray-900">{row.date}</td>
                        <td className="px-6 py-3 text-center font-bold text-blue-700">{row.total}</td>
                        <td className="px-6 py-3 text-center text-gray-600">{row.water}</td>
                        <td className="px-6 py-3 text-center text-gray-600">{row.nonWater}</td>
                        <td className="px-6 py-3 text-right">
                          <button
                            onClick={() => proceedToMediaPrep(row.date)}
                            className="inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded transition"
                          >
                            Prepare Media &rarr;
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Available Uploads History */}
      {recentReports.length > 1 && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Other Available Uploaded Months</h3>
          <div className="flex flex-wrap gap-2">
            {recentReports.map((r) => (
              <button
                key={r.id}
                onClick={() => selectReport(r)}
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
