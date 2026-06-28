import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import PrismBackground from "@/components/prism/PrismBackground";
import PrismAnalysisAnimation from "@/components/prism/PrismAnalysisAnimation";
import type { BirthData, NatalChart } from "../services/astrologyEngine";
import { calculateNatalChart } from "../services/astrologyEngine";
import { generateBirthReport500 } from "../services/birthReport500";
import { getGlobalReportType, setGlobalReportType } from "../services/reportSession";
import { savePreviewReportText, saveReportText, clearReportText, clearAiReportDone, saveReportId, saveBirthData } from "../services/reportStore";
import { saveReportToServer } from "../services/reportApi";
import { trackEvent, trackFbPurchase } from "../services/tracking";
import { getRouterSearchParams } from "../utils/routerQuery";
import { getOrderStatus } from "../services/paymentApi";

export default function GeneratingPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [charCount, setCharCount] = useState(0);
  const [statusText, setStatusText] = useState("");
  const doneRef = useRef(false);

  useEffect(() => {
    if (doneRef.current) return;
    doneRef.current = true;

    const params = getRouterSearchParams();
    const orderId = params.get("orderId");
    const reportId = params.get("reportId");
    const reportType = (params.get("reportType") as any) || getGlobalReportType();
    const isPaid = params.get("paid") === "1";
    const birthDataRaw = sessionStorage.getItem("taiji_birth_data");
    const birthData: BirthData | null = birthDataRaw ? JSON.parse(birthDataRaw) : null;

    setGlobalReportType(reportType);

    if (isPaid && orderId && reportId) {
      handlePaidGeneration(orderId, reportId, reportType);
    } else if (birthData) {
      handlePreviewGeneration(birthData, reportType);
    } else if (reportId) {
      navigate(`/generator/final-report?reportType=${encodeURIComponent(reportType)}&reportId=${encodeURIComponent(reportId)}`, { replace: true });
    } else {
      navigate("/generator", { replace: true });
    }
  }, []);

  async function handlePreviewGeneration(birthData: BirthData, reportType: string) {
    try {
      setStatusText(t("genCalculatingChart"));
      const natalChart = await calculateNatalChart(birthData);
      saveBirthData(birthData);
      sessionStorage.setItem("taiji_chart_json", JSON.stringify(natalChart));

      setStatusText(t("genReportGenerating"));
      const text = generateBirthReport500(natalChart, i18n.language);
      if (!text.trim()) throw new Error(t("genReportFailed"));

      savePreviewReportText(text, reportType as any);
      setCharCount(text.length);

      const reportId = await import("../services/reportId").then(m => m.computeReportId(birthData, reportType as any));
      saveReportId(reportId, reportType as any);

      await saveReportToServer({ reportId, reportText: text, chartJson: natalChart, displayName: birthData.name || undefined, reportType: reportType as any }).catch(() => {});

      navigate(`/generator/final-report?reportType=${encodeURIComponent(reportType)}&reportId=${encodeURIComponent(reportId)}`, { replace: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("Error generating preview:", e);
      alert(t("genReportError", { message: msg }));
      navigate("/generator", { replace: true });
    }
  }

  async function handlePaidGeneration(orderId: string, reportId: string, reportType: string) {
    try {
      setStatusText(t("confirmingPayment"));
      for (let i = 0; i < 30; i++) {
        const status = await getOrderStatus(orderId).catch(() => null);
        if (status?.unlocked || status?.status === "paid") {
          setStatusText(t("aiGenerating"));
          const chartRaw = sessionStorage.getItem("taiji_chart_json");
          const chart: NatalChart | null = chartRaw ? JSON.parse(chartRaw) : null;
          if (chart) {
            const { generateReportText } = await import("../services/reportGenerator");
            const preview = await import("../services/reportStore").then(m => m.loadPreviewReportText(reportType as any));
            trackFbPurchase({ eventId: orderId, value: (status as any).amount ? (status as any).amount / 100 : 0, currency: "USD" });
            const aiText = await generateReportText(chart, reportType as any, (c) => setCharCount(c), preview, i18n.language);
            if (aiText.trim()) {
              saveReportText(aiText, reportType as any);
              trackEvent("report_success", true);
            }
          }
          navigate(`/generator/final-report?reportType=${encodeURIComponent(reportType)}&reportId=${encodeURIComponent(reportId)}`, { replace: true });
          return;
        }
        await new Promise(r => setTimeout(r, 2000));
      }
      navigate(`/generator/final-report?reportType=${encodeURIComponent(reportType)}&reportId=${encodeURIComponent(reportId)}`, { replace: true });
    } catch (e) {
      console.error("Error in paid generation:", e);
      navigate(`/generator/final-report?reportType=${encodeURIComponent(reportType)}&reportId=${encodeURIComponent(reportId)}`, { replace: true });
    }
  }

  return (
    <div className="prism-root min-h-screen relative overflow-hidden">
      <PrismBackground />
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <PrismAnalysisAnimation charCount={charCount} />
        {statusText && (
          <p className="text-sm" style={{ color: "var(--prism-cream)" }}>{statusText}</p>
        )}
        <p className="text-xs opacity-70" style={{ color: "var(--prism-cream)" }}>
          {charCount > 0 ? t("genReportGenerating") : t("genCalculatingChart")}
        </p>
      </div>
    </div>
  );
}
