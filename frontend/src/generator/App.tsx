import "./polyfills";
import "./index.css";
import "@/styles/prism.css";
import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Routes, Route, useNavigate } from "react-router";
import PrismBackground from "@/components/prism/PrismBackground";
import HomePage from "./pages/HomePage";
import StarDataReview from "./pages/StarDataReview";
import TextReport from "./pages/TextReport";
import BlueprintReport from "./pages/BlueprintReport";
import GeneratingPage from "./pages/GeneratingPage";
import SettingsPage from "./pages/SettingsPage";
import { saveReportText, clearReportText, saveReportId, saveBirthData, savePreviewReportText, clearAiReportDone } from "./services/reportStore";
import { computeReportId } from "./services/reportId";
import { getGlobalReportType, setGlobalReportType } from "./services/reportSession";
import type { ReportTypeId } from "./types/reportTypes";
import { saveReportToServer } from "./services/reportApi";
import { bindPrepaidReport, getPrepaidOrderId } from "./services/partnerApi";
import { calculateNatalChart } from "./services/astrologyEngine";
import type { BirthData, NatalChart } from "./services/astrologyEngine";
import { GeneratorTopRightActions } from "./components/GeneratorTopRightActions";
import { generateBirthReport500 } from "./services/birthReport500";

let globalChart: NatalChart | null = null;
let globalReportText: string = "";

export function getGlobalChart(): NatalChart | null { return globalChart; }
export function getGlobalReportText(): string { return globalReportText; }
export { getGlobalReportType, setGlobalReportType };
export function setGlobalReportText(text: string, reportType?: ReportTypeId) {
  globalReportText = text;
  saveReportText(text, reportType ?? getGlobalReportType());
}

export default function App() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    if (globalChart) sessionStorage.setItem("taiji_chart_json", JSON.stringify(globalChart));
  }, []);

  const handleTextConfirm = useCallback(async (text: string) => {
    const activeChart = globalChart;
    if (!activeChart) return;
    const reportType = getGlobalReportType();
    globalReportText = text;
    saveReportText(text, reportType);
    const reportId = await computeReportId(activeChart.birthData, reportType);
    saveReportId(reportId, reportType);
    await saveReportToServer({ reportId, reportText: text, chartJson: activeChart, displayName: activeChart.birthData.name || undefined, reportType }).catch(() => {});
  }, []);

  return (
    <div className="prism-root relative min-h-screen">
      <PrismBackground />
      <div className="relative z-10">
        <GeneratorTopRightActions />
        <Routes>
          <Route index element={<HomePage />} />
          <Route path="data-review" element={<StarDataReview chart={globalChart} />} />
          <Route path="text-report" element={<TextReport chart={globalChart} onTextConfirm={handleTextConfirm} />} />
          <Route path="generating" element={<GeneratingPage />} />
          <Route path="final-report" element={<BlueprintReport chart={globalChart} />} />
          <Route path="settings" element={<SettingsPage />} />
        </Routes>
      </div>
    </div>
  );
}
