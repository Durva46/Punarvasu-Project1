/**
 * frontend/src/components/layout/Navbar.tsx
 *
 * Top navigation bar adhering to design language:
 * Light background, subtle borders, blue/green accents, desktop-first.
 * Includes Autoclave Log Book (Step 2) and disabled placeholders for Stages 3-7.
 */

import React from "react";
import { Link, useLocation } from "react-router-dom";

export const Navbar: React.FC = () => {
  const location = useLocation();

  // Workflow requested by user:
  // 1. Upload Excel sheet & analysis
  // 2. Perform the 7 steps:
  //    - Step 1: Media Preparation
  //    - Step 2: Autoclave Log Book (Sterilization)
  //    - Stage 3: LAF Log Book (To be provided)
  //    - Stage 4: B.O.D. Incubator Log Book for Bacteria (Set Temperature 30-35° C) (To be provided)
  //    - Stage 5: B.O.D. Incubator Log Book for Fungus (Set Temperature 20-25° C) (To be provided)
  //    - Stage 6: B.O.D. Incubator Log Book for Pathogen (Set Temperature 37° C) (To be provided)
  //    - Stage 7: Colony Counter Log Book (To be provided)
  // 3. Download the report that is generated (Final Review & Downloads)
  const workflowSteps = [
    { label: "1. Upload & Analysis", path: "/imports", type: "active" },
    { label: "Step 1: Media Preparation", path: "/media", type: "active" },
    { label: "Step 2: Autoclave Log Book", path: "/autoclave", type: "active" },
    { label: "Stage 3: LAF Log Book", path: "/laf", type: "active" },
    { label: "Stage 4: B.O.D. Bacteria (30-35°C)", path: "/bod-bacteria", type: "active" },
    { label: "Stage 5: B.O.D. Fungus (20-25°C)", title: "B.O.D. Incubator Log Book for Fungus (Set Temperature 20-25° C) — To be provided", type: "placeholder" },
    { label: "Stage 6: B.O.D. Pathogen (37°C)", title: "B.O.D. Incubator Log Book for Pathogen (Set Temperature 37° C) — To be provided", type: "placeholder" },
    { label: "Stage 7: Colony Counter", title: "Colony Counter Log Book — To be provided", type: "placeholder" },
    { label: "Download Reports", path: "/reports", type: "active" },
  ];

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo / Unit Identity */}
          <Link to="/imports" className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              PM
            </div>
            <div>
              <span className="font-bold text-gray-900 tracking-tight text-base">LabFlow</span>
              <span className="hidden lg:inline ml-2 text-xs text-gray-500">
                PETLAD MAHAL AROGYA MANDAL PHARMACY
              </span>
            </div>
          </Link>

          {/* Step-by-Step Laboratory Workflow Navigation */}
          <nav className="flex items-center space-x-1 overflow-x-auto py-2">
            {workflowSteps.map((item, idx) => {
              if (item.type === "active" && item.path) {
                const active = location.pathname === item.path ||
                  (item.path !== "/" && location.pathname.startsWith(item.path) && item.path !== "/settings");
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                      active
                        ? "bg-blue-50 text-blue-700 border-b-2 border-blue-600 shadow-xs"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              }

              // Placeholder stages (3-7)
              return (
                <span
                  key={idx}
                  className="px-2 py-1 rounded text-[11px] text-gray-400 bg-gray-50 border border-dashed border-gray-200 cursor-not-allowed whitespace-nowrap"
                  title={item.title}
                >
                  {item.label}
                </span>
              );
            })}

            <div className="pl-2 border-l border-gray-200 flex items-center space-x-1">
              <Link
                to="/settings"
                className={`px-2 py-1 rounded text-xs font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-50 ${
                  location.pathname.startsWith("/settings") ? "text-blue-600 font-bold" : ""
                }`}
              >
                Settings
              </Link>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
};
