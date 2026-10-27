/**
 * frontend/src/App.tsx
 *
 * Application root and route mapping.
 */

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Navbar } from "./components/layout/Navbar";
import { ExcelUploadPage } from "./pages/ExcelUploadPage";
import { MediaPage } from "./pages/MediaPage";
import { AutoclavePage } from "./pages/AutoclavePage";
import { AutoclaveSettingsPage } from "./pages/AutoclaveSettingsPage";
import { AlertsPage } from "./pages/AlertsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { FinalReviewPage } from "./pages/FinalReviewPage";
import { PrintViewPage } from "./pages/PrintViewPage";

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="max-w-7xl mx-auto px-4 py-16 text-center">
      <h2 className="text-xl font-bold text-gray-800">{title}</h2>
      <p className="text-sm text-gray-500 mt-2">Downloads are available in Final Review & Downloads (Phase 7).</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Navigate to="/imports" replace />} />
            <Route path="/imports" element={<ExcelUploadPage />} />
            <Route path="/media" element={<MediaPage />} />
            <Route path="/autoclave" element={<AutoclavePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/autoclave" element={<AutoclaveSettingsPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/reports" element={<FinalReviewPage />} />
            <Route path="/final-review" element={<FinalReviewPage />} />
            <Route path="/print" element={<PrintViewPage />} />
            <Route path="*" element={<Navigate to="/imports" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
