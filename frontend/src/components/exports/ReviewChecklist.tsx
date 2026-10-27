/**
 * frontend/src/components/exports/ReviewChecklist.tsx
 *
 * Real checklist component from GET /api/v1/final-review.
 * Renders each item with icon, category, and navigation link.
 */

import React from "react";
import { Link } from "react-router-dom";
import { FinalReviewChecklistItem } from "../../types";

interface ReviewChecklistProps {
  checklist: FinalReviewChecklistItem[];
  hasIncompleteItems: boolean;
}

export const ReviewChecklist: React.FC<ReviewChecklistProps> = ({
  checklist,
  hasIncompleteItems,
}) => {
  return (
    <div className="bg-white rounded-xl border border-line shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-line bg-surface/30 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Workflow Review Checklist</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real verification and processing status from the database.
          </p>
        </div>
        <div>
          {hasIncompleteItems ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Action Items Pending
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              All Workflow Items Ready
            </span>
          )}
        </div>
      </div>

      <div className="divide-y divide-line">
        {checklist.map((item) => {
          let badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
          let icon = "✓";
          if (item.status === "WARNING") {
            badgeClass = "bg-amber-50 text-amber-700 border-amber-200";
            icon = "!";
          } else if (item.status === "ERROR") {
            badgeClass = "bg-rose-50 text-rose-700 border-rose-200";
            icon = "✕";
          }

          return (
            <div
              key={item.id}
              className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs border shrink-0 mt-0.5 ${badgeClass}`}
                >
                  {icon}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">{item.title}</h3>
                  <p className="text-xs text-slate-600 mt-0.5">{item.description}</p>
                </div>
              </div>

              <Link
                to={item.linkPath}
                className="text-xs font-semibold text-primary hover:text-primary-hover px-3 py-1 rounded border border-slate-200 hover:border-primary/30 bg-white shadow-xs self-start sm:self-auto shrink-0 transition"
              >
                Go to Step →
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
};
