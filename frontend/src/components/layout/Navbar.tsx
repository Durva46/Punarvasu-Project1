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

  const mainNavItems = [
    { label: "1. Excel Upload & Counts", path: "/imports", disabled: false },
    { label: "Stage 1: Media Preparation", path: "/media", disabled: false },
    { label: "Stage 2: Autoclave Log", path: "/autoclave", disabled: false },
    { label: "Final Review & Downloads", path: "/reports", disabled: false },
    { label: "Alerts", path: "/alerts", disabled: false },
    { label: "Settings", path: "/settings", disabled: false },
  ];

  const disabledStages = [
    { label: "Stage 3: LAF Log", title: "LAF Log Book (To be provided)" },
    { label: "Stage 4: B.O.D. Bacteria", title: "B.O.D. Incubator – Bacteria (To be provided)" },
    { label: "Stage 5: B.O.D. Fungus", title: "B.O.D. Incubator – Fungus (To be provided)" },
    { label: "Stage 6: B.O.D. Pathogen", title: "B.O.D. Incubator – Pathogen (To be provided)" },
    { label: "Stage 7: Colony Counter", title: "Colony Counter Log Book (To be provided)" },
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

          {/* Active Navigation items */}
          <nav className="flex items-center space-x-1">
            {mainNavItems.map((item) => {
              const active = location.pathname === item.path ||
                (item.path !== "/" && location.pathname.startsWith(item.path) && item.path !== "/settings");
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    active
                      ? "bg-blue-50 text-blue-700 border-b-2 border-blue-600"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}

            {/* Stages 3-7 Disabled Placeholders */}
            <div className="hidden xl:flex items-center space-x-1 pl-2 border-l border-gray-200">
              {disabledStages.map((s, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 rounded text-[10px] text-gray-400 bg-gray-50 cursor-not-allowed"
                  title={s.title}
                >
                  {s.label}
                </span>
              ))}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
};
