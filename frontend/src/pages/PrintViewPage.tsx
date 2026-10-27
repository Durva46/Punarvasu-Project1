/**
 * frontend/src/pages/PrintViewPage.tsx
 *
 * Dedicated Print View page matching printed lab layouts.
 * - Hides navigation and interactive buttons on print.
 * - @page { size: A4 landscape; margin: 10mm; }
 * - Repeated table headers across printed pages.
 */

import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";

export const PrintViewPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const month = searchParams.get("month") || "";
  const part = searchParams.get("part") || "package";

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!month) {
      setError("Reporting month is required for printing.");
      setLoading(false);
      return;
    }

    apiFetch<any>(`/api/v1/exports/print-data?month=${month}&part=${part}`)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load print data.");
        setLoading(false);
      });
  }, [month, part]);

  const handlePrintClick = () => {
    window.print();
  };

  if (loading) {
    return <div className="p-8 text-center text-sm text-slate-500">Preparing print layout...</div>;
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-600">
        <p className="font-bold">Error loading print view</p>
        <p className="text-sm">{error}</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 px-4 py-1.5 bg-slate-200 rounded text-xs"
        >
          ← Go Back
        </button>
      </div>
    );
  }

  const showMedia = part === "media" || part === "package";
  const showAutoclave = part === "autoclave" || part === "package";

  return (
    <div className="min-h-screen bg-white text-black p-4 sm:p-8 font-sans print:p-0">
      {/* Interactive Controls (Hidden during print) */}
      <div className="no-print mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between shadow-xs">
        <div>
          <h1 className="text-base font-bold text-slate-800">Print Preview — {month}</h1>
          <p className="text-xs text-slate-500">
            Click Print to open browser dialog. Page breaks and headers are formatted for A4 landscape.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100"
          >
            ← Back
          </button>
          <button
            onClick={handlePrintClick}
            className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-xs flex items-center gap-1.5"
          >
            <span>🖨️</span>
            <span>Print Now</span>
          </button>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { size: A4 landscape; margin: 12mm 10mm 15mm 10mm; }
          .page-break { page-break-before: always; }
          thead { display: table-header-group; }
          tr { page-break-inside: avoid; }
        }
      `}</style>

      {/* 1. Media Preparation Record */}
      {showMedia && data?.mediaRows && (
        <section className="mb-12">
          {/* Header */}
          <div className="text-center mb-4">
            <h2 className="text-base font-bold uppercase tracking-wide">
              PETLAD MAHAL AROGYA MANDAL PHARMACY
            </h2>
            <p className="text-xs italic text-gray-700">
              At & Po. Village- Piplata- 387355, Ta.: Nadiad, Dist.: Kheda (Gujarat)
            </p>
            <h3 className="text-sm font-bold mt-1 text-blue-900">
              Media Preparation Record — {month}
            </h3>
          </div>

          <table className="w-full text-left border-collapse border border-gray-400 text-[10px]">
            <thead>
              <tr className="bg-blue-700 text-white font-bold border border-gray-400">
                <th className="border border-gray-400 p-1.5 text-center w-20">Date</th>
                <th className="border border-gray-400 p-1.5">Name of Media</th>
                <th className="border border-gray-400 p-1.5 text-right w-24">Opening (gm)</th>
                <th className="border border-gray-400 p-1.5 text-right w-24">Qty Used (gm)</th>
                <th className="border border-gray-400 p-1.5 text-right w-24">Balance (gm)</th>
                <th className="border border-gray-400 p-1.5 text-center w-16">Tube/Plates</th>
                <th className="border border-gray-400 p-1.5">Used in</th>
                <th className="border border-gray-400 p-1.5 text-center w-28">Prepared by</th>
                <th className="border border-gray-400 p-1.5 text-center w-16">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.mediaRows.map((r: any, idx: number) => (
                <tr key={idx} className="border border-gray-300">
                  <td className="border border-gray-300 p-1.5 text-center font-medium">{r.date}</td>
                  <td className="border border-gray-300 p-1.5 font-medium">{r.mediaName}</td>
                  <td className="border border-gray-300 p-1.5 text-right">
                    {r.openingBalanceGm !== null ? r.openingBalanceGm.toFixed(2) : "—"}
                  </td>
                  <td className="border border-gray-300 p-1.5 text-right">
                    {r.quantityUsedGm !== null ? r.quantityUsedGm.toFixed(2) : "—"}
                  </td>
                  <td className="border border-gray-300 p-1.5 text-right">
                    {r.balanceGm !== null ? r.balanceGm.toFixed(2) : "—"}
                  </td>
                  <td className="border border-gray-300 p-1.5 text-center">{r.tubePlates}</td>
                  <td className="border border-gray-300 p-1.5">{r.usedIn}</td>
                  <td className="border border-gray-300 p-1.5 text-center">{r.preparedBy}</td>
                  <td className="border border-gray-300 p-1.5 text-center">
                    {r.isBlocked ? <span className="font-bold text-red-600">Blocked</span> : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-6 flex justify-between text-xs font-bold px-8">
            <div>Prepared By: ___________________________</div>
            <div>Approved By: ___________________________</div>
          </div>
        </section>
      )}

      {/* Page break between parts if combined */}
      {showMedia && showAutoclave && <div className="page-break" />}

      {/* 2. Autoclave Log Book (Sterilization) */}
      {showAutoclave && data?.autoclaveRows && (
        <section className="mb-12">
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-base font-bold uppercase tracking-wide">
                PETLAD MAHAL AROGYA MANDAL PHARMACY, Piplata
              </h2>
              <h3 className="text-sm font-bold text-blue-900">
                Autoclave Log Book (Sterilization)
              </h3>
              <p className="text-xs text-gray-600">Reporting Month: {month}</p>
            </div>
            {data.equipment && (
              <div className="border border-gray-400 p-2 text-[10px] bg-gray-50 rounded">
                <div><strong>Format No.:</strong> {data.equipment.formatNo}</div>
                <div><strong>Ref. SOP No.:</strong> {data.equipment.refSopNo}</div>
                <div><strong>Equipment No.:</strong> {data.equipment.equipmentNo}</div>
              </div>
            )}
          </div>

          <table className="w-full text-left border-collapse border border-gray-400 text-[10px]">
            <thead>
              <tr className="bg-blue-900 text-white font-bold">
                <th rowSpan={2} className="border border-gray-400 p-1 text-center w-18">Date</th>
                <th rowSpan={2} className="border border-gray-400 p-1">Name of Cycle Load</th>
                <th rowSpan={2} className="border border-gray-400 p-1 text-center w-18">Autoclave Start</th>
                <th colSpan={4} className="border border-gray-400 p-1 text-center">Sterilization</th>
                <th rowSpan={2} className="border border-gray-400 p-1">Cleaning (weekly)</th>
                <th rowSpan={2} className="border border-gray-400 p-1 text-center w-24">Done by</th>
                <th rowSpan={2} className="border border-gray-400 p-1 text-center w-22">Verification</th>
              </tr>
              <tr className="bg-blue-900 text-white font-bold text-[9px]">
                <th className="border border-gray-400 p-1 text-center w-18">Start Time</th>
                <th className="border border-gray-400 p-1 text-center w-16">Temp</th>
                <th className="border border-gray-400 p-1 text-center w-16">Pressure</th>
                <th className="border border-gray-400 p-1 text-center w-18">End Time</th>
              </tr>
            </thead>
            <tbody>
              {data.autoclaveRows.map((r: any, idx: number) => {
                const isVerified = r.verificationStatus === "Verified";
                return (
                  <tr key={idx} className="border border-gray-300">
                    <td className="border border-gray-300 p-1 text-center font-medium">{r.date}</td>
                    <td className="border border-gray-300 p-1">{r.cycleLoadName}</td>
                    <td className="border border-gray-300 p-1 text-center">{r.autoclaveStartTime}</td>
                    <td className="border border-gray-300 p-1 text-center">
                      <div>{r.sterilizationStartTime}</div>
                      {isVerified && r.actualStartTime && (
                        <div className="text-[9px] text-gray-500">Act: {r.actualStartTime}</div>
                      )}
                    </td>
                    <td className="border border-gray-300 p-1 text-center">
                      <div>{r.temperatureC}</div>
                      {isVerified && r.actualTemperatureC && (
                        <div className="text-[9px] text-gray-500">Act: {r.actualTemperatureC}</div>
                      )}
                    </td>
                    <td className="border border-gray-300 p-1 text-center">
                      <div>{r.pressure}</div>
                      {isVerified && r.actualPressure && (
                        <div className="text-[9px] text-gray-500">Act: {r.actualPressure}</div>
                      )}
                    </td>
                    <td className="border border-gray-300 p-1 text-center">
                      <div>{r.endTime}</div>
                      {isVerified && r.actualEndTime && (
                        <div className="text-[9px] text-gray-500">Act: {r.actualEndTime}</div>
                      )}
                    </td>
                    <td className="border border-gray-300 p-1">{r.cleaningWeekly}</td>
                    <td className="border border-gray-300 p-1 text-center">{r.doneBy}</td>
                    <td className="border border-gray-300 p-1 text-center font-bold">
                      <span
                        className={
                          r.verificationStatus === "Verified"
                            ? "text-emerald-700"
                            : r.verificationStatus === "Pending verification"
                            ? "text-blue-700"
                            : "text-gray-500"
                        }
                      >
                        {r.verificationStatus}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="mt-2 text-[9px] italic text-gray-600">
            * Values marked Planned are laboratory defaults entered in advance and are not verified operating records. Only entries marked Verified have verified readings.
          </div>

          <div className="mt-6 flex justify-between text-xs font-bold px-8">
            <div>Done By: ___________________________</div>
            <div>Checked By: ___________________________</div>
          </div>
        </section>
      )}
    </div>
  );
};
