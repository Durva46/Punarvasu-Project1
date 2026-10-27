/**
 * frontend/src/components/exports/DownloadCards.tsx
 *
 * Cards for downloading:
 * 1. Media Preparation Record (Excel, PDF, Print)
 * 2. Autoclave Log Book (Excel, PDF, Print)
 * 3. Combined Monthly Package (Excel, PDF, Print)
 */

import React, { useState } from "react";

interface DownloadCardsProps {
  month: string;
  onDownload: (part: "media" | "autoclave" | "package", format: "xlsx" | "pdf") => Promise<void>;
  onPrint: (part: "media" | "autoclave" | "package") => void;
}

export const DownloadCards: React.FC<DownloadCardsProps> = ({
  month,
  onDownload,
  onPrint,
}) => {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleAction = async (part: "media" | "autoclave" | "package", format: "xlsx" | "pdf") => {
    try {
      setDownloading(`${part}-${format}`);
      await onDownload(part, format);
    } finally {
      setDownloading(null);
    }
  };

  const cards = [
    {
      id: "media",
      title: "Media Preparation Record",
      subtitle: "3-line laboratory header, 8 columns, grouped by date, balance ledger & used in samples.",
      part: "media" as const,
      color: "border-blue-200 bg-blue-50/20",
    },
    {
      id: "autoclave",
      title: "Autoclave Log Book (Sterilization)",
      subtitle: "Equipment info box, sterilization sub-columns, weekly cleaning & verified readings.",
      part: "autoclave" as const,
      color: "border-indigo-200 bg-indigo-50/20",
    },
    {
      id: "package",
      title: "Combined Monthly Package",
      subtitle: "Excel: 2 worksheets. PDF: Continuous pagination across Media & Autoclave records.",
      part: "package" as const,
      color: "border-emerald-200 bg-emerald-50/20",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {cards.map((card) => (
        <div
          key={card.id}
          className={`rounded-xl border p-5 shadow-sm bg-white flex flex-col justify-between ${card.color}`}
        >
          <div>
            <h3 className="text-base font-bold text-slate-900">{card.title}</h3>
            <p className="text-xs text-slate-600 mt-1 min-h-[36px]">{card.subtitle}</p>
          </div>

          <div className="pt-5 mt-4 border-t border-line space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleAction(card.part, "xlsx")}
                disabled={Boolean(downloading) || !month}
                className="w-full text-xs font-semibold px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50"
              >
                <span>📊</span>
                <span>
                  {downloading === `${card.part}-xlsx` ? "Exporting..." : "Export Excel"}
                </span>
              </button>

              <button
                onClick={() => handleAction(card.part, "pdf")}
                disabled={Boolean(downloading) || !month}
                className="w-full text-xs font-semibold px-3 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50"
              >
                <span>📄</span>
                <span>
                  {downloading === `${card.part}-pdf` ? "Exporting..." : "Export PDF"}
                </span>
              </button>
            </div>

            <button
              onClick={() => onPrint(card.part)}
              disabled={!month}
              className="w-full text-xs font-semibold px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg shadow-2xs flex items-center justify-center gap-1.5 transition"
            >
              <span>🖨️</span>
              <span>Print View</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
