/**
 * frontend/src/components/autoclave/AutoclaveValidationBanner.tsx
 *
 * Prominent compliance banner and active validation warnings panel.
 */

import React from "react";
import { AlertItem } from "../../types";

interface Props {
  alerts: AlertItem[];
  onSelectDate?: (dateStr: string) => void;
}

export const AutoclaveValidationBanner: React.FC<Props> = ({ alerts }) => {
  return (
    <div className="space-y-3">
      {/* Required Disclaimer Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
            i
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-900 leading-snug">
              Prefilled values are planned defaults, not verified readings.
            </p>
            <p className="text-xs text-blue-800 mt-0.5">
              A cycle is only marked Verified after actual readings are entered and verified by an authorized verifier or administrator.
            </p>
          </div>
        </div>

        <div className="text-[11px] font-medium text-blue-700 sm:text-right shrink-0 bg-blue-100/60 px-2.5 py-1 rounded">
          Rule: One autoclave cycle per date covering all samples registered that day.
        </div>
      </div>

      {/* Warnings Panel */}
      {alerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">
              Autoclave Validation Warnings ({alerts.length})
            </h4>
          </div>

          <div className="space-y-1.5 divide-y divide-amber-200/60">
            {alerts.map((a) => (
              <div key={a.id} className="pt-1.5 first:pt-0 flex items-center justify-between text-xs text-amber-900">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] bg-amber-200/80 px-1.5 py-0.5 rounded text-amber-900 font-semibold">
                    {a.alertType}
                  </span>
                  <span>{a.message}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
