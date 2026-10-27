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
import { LafPage } from "./pages/LafPage";
import { BodBacteriaPage } from "./pages/BodBacteriaPage";
import { BodFungusPage } from "./pages/BodFungusPage";
import { AlertsPage } from "./pages/AlertsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { FinalReviewPage } from "./pages/FinalReviewPage";
import { PrintViewPage } from "./pages/PrintViewPage";

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
            <Route path="/laf" element={<LafPage />} />
            <Route path="/stages/3" element={<LafPage />} />
            <Route path="/bod-bacteria" element={<BodBacteriaPage />} />
            <Route path="/stages/4" element={<BodBacteriaPage />} />
            <Route path="/bod-fungus" element={<BodFungusPage />} />
            <Route path="/stages/5" element={<BodFungusPage />} />
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
