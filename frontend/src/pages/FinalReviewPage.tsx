/**
 * frontend/src/pages/FinalReviewPage.tsx
 *
 * Final Review & Downloads (Phase 7).
 * - Reporting month picker.
 * - Real checklist from GET /api/v1/final-review.
 * - Download cards for Media, Autoclave, and Combined Package (Excel, PDF, Print).
 * - Recent downloads audit from export_log.
 * - Downloads are ALWAYS permitted even with warnings.
 */

import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FinalReviewSummary, ExportDownloadLogItem } from "../types";
import { apiFetch } from "../lib/api";
import { ReviewChecklist } from "../components/exports/ReviewChecklist";
import { DownloadCards } from "../components/exports/DownloadCards";
import { RecentDownloadsTable } from "../components/exports/RecentDownloadsTable";

export const FinalReviewPage: React.FC = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<any[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string>("");
  const [summary, setSummary] = useState<FinalReviewSummary | null>(null);
  const [logs, setLogs] = useState<ExportDownloadLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [logsLoading, setLogsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initial load: available reports
  useEffect(() => {
    apiFetch<any[]>("/api/v1/imports")
      .then((repList) => {
        setReports(repList);
        if (repList.length > 0) {
          const lastReport = localStorage.getItem("autoclave_last_report_id");
          const exists = repList.some((r) => r.id === lastReport);
          setSelectedReportId(exists && lastReport ? lastReport : repList[0].id);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const currentReport = reports.find((r) => r.id === selectedReportId);
  const monthStr = currentReport?.reportingMonth || "";

  // Load summary and logs when month changes
  const fetchData = async () => {
    if (!monthStr) return;
    setLoading(true);
    setError(null);
    try {
      const summaryData = await apiFetch<FinalReviewSummary>(
        `/api/v1/final-review?month=${monthStr}`
      );
      setSummary(summaryData);
    } catch (err: any) {
      setError(err.message || "Failed to load final review summary.");
    } finally {
      setLoading(false);
    }

    fetchLogs();
  };

  const fetchLogs = async () => {
    if (!monthStr) return;
    setLogsLoading(true);
    try {
      const logData = await apiFetch<ExportDownloadLogItem[]>(`/api/v1/exports/log?month=${monthStr}`);
      setLogs(logData);
    } catch (err) {
      console.error("Failed to load export logs", err);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedReportId, monthStr]);

  // Handle Export File Download
  const handleDownload = async (part: "media" | "autoclave" | "package", format: "xlsx" | "pdf") => {
    if (!monthStr) return;
    const token = localStorage.getItem("auth_token") || "";
    const url = `/api/v1/exports/${part}?month=${monthStr}&format=${format}`;

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        throw new Error(json?.error?.message || "Export download failed.");
      }

      // Check if server returned a JSON signedUrl for large file
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const resData = await response.json();
        if (resData?.data?.signedUrl) {
          window.location.href = resData.data.signedUrl;
          fetchLogs();
          return;
        }
      }

      // Direct stream blob download
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      const fileName =
        part === "media"
          ? `Media_Preparation_Record_${monthStr}.${format}`
          : part === "autoclave"
          ? `Autoclave_Log_Book_${monthStr}.${format}`
          : `Monthly_Package_${monthStr}.${format}`;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);

      fetchLogs();
    } catch (err: any) {
      alert(err.message || "Failed to download export file.");
    }
  };

  const handlePrint = (part: "media" | "autoclave" | "package") => {
    if (!monthStr) return;
    navigate(`/print?month=${monthStr}&part=${part}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 font-sans">
      {/* Page Title & Month Picker */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Final Review & Downloads
          </h1>
          <p className="text-sm text-gray-500">
            PETLAD MAHAL AROGYA MANDAL PHARMACY · Complete Monthly Export Package
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-gray-700">Reporting Month:</label>
          <select
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white shadow-sm font-medium"
            value={selectedReportId}
            onChange={(e) => setSelectedReportId(e.target.value)}
          >
            {reports.map((r) => (
              <option key={r.id} value={r.id}>
                {r.reportingMonth} ({r.fileName})
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      {/* Information Banner (Incomplete or Warning items) */}
      {summary?.hasIncompleteItems && (
        <div className="bg-amber-50 border border-amber-300 text-amber-900 p-4 rounded-xl flex items-start gap-3 shadow-xs">
          <span className="text-xl">ℹ️</span>
          <div className="text-xs space-y-0.5">
            <p className="font-bold uppercase tracking-wider text-amber-800">
              Notice: Some workflow items are incomplete
            </p>
            <p className="text-amber-700">
              Files will be generated with the current saved data. Unverified autoclave entries are labelled as "Planned" or "Pending verification". Downloads are always permitted.
            </p>
          </div>
        </div>
      )}

      {/* Always Editable Reminder */}
      <div className="bg-slate-50 border border-slate-200 text-slate-600 px-4 py-2.5 rounded-lg text-xs flex items-center justify-between">
        <p>
          💡 <strong>Live Data Guarantee:</strong> Files always use the latest saved database entries. If you edit any record, download again to reflect the latest values.
        </p>
        <Link
          to="/media"
          className="text-primary hover:text-primary-hover font-semibold whitespace-nowrap ml-4"
        >
          View Media Page →
        </Link>
      </div>

      {/* 1. Review Checklist */}
      {loading ? (
        <div className="p-12 text-center text-sm text-slate-400">Loading checklist...</div>
      ) : summary ? (
        <ReviewChecklist
          checklist={summary.checklist}
          hasIncompleteItems={summary.hasIncompleteItems}
        />
      ) : null}

      {/* 2. Download Cards */}
      <div>
        <div className="mb-3">
          <h2 className="text-base font-semibold text-slate-800">Export & Print Options</h2>
          <p className="text-xs text-slate-500">
            Official laboratory formatted spreadsheets, PDFs, and browser-printable layouts.
          </p>
        </div>
        <DownloadCards
          month={monthStr}
          onDownload={handleDownload}
          onPrint={handlePrint}
        />
      </div>

      {/* 3. Recent Downloads Audit Log */}
      <RecentDownloadsTable logs={logs} isLoading={logsLoading} />
    </div>
  );
};
