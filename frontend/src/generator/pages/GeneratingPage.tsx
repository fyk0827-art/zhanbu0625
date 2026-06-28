import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import PrismBackground from "@/components/prism/PrismBackground";
import PrismAnalysisAnimation from "@/components/prism/PrismAnalysisAnimation";
import type { BirthData, NatalChart } from "../services/astrologyEngine";
import { calculateNatalChart } from "../services/astrologyEngine";
import { generateBirthReport500 } from "../services/birthReport500";
import { getGlobalReportType, setGlobalReportType } from "../services/reportSession";
import { savePreviewReportText, saveReportText, saveReportId, saveBirthData, markAiReportDone } from "../services/reportStore";
import { saveReportToServer, fetchReportFromServer } from "../services/reportApi";
import { trackEvent, trackFbPurchase } from "../services/tracking";
import { getRouterSearchParams } from "../utils/routerQuery";
import { getOrderStatus, capturePayPalOrder } from "../services/paymentApi";

export default function GeneratingPage() {
  const { t, i18n } = useTranslation();
  const [charCount, setCharCount] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    run();
  }, []);

  async function run() {
    const params = getRouterSearchParams();
    const orderId = params.get("orderId");
    const reportId = params.get("reportId");
    const reportType = (params.get("reportType") as any) || getGlobalReportType();
    const token = params.get("token");
    const isPaypalReturn = Boolean(orderId && token);
    setGlobalReportType(reportType);

    if (isPaypalReturn && orderId && token) {
      await handlePaypalCapture(orderId, token, reportId, reportType);
    } else if (orderId && reportId) {
      await handlePaidGeneration(orderId, reportId, reportType);
    } else if (reportId) {
      window.location.href = `/generator/final-report?reportType=${encodeURIComponent(reportType)}&reportId=${encodeURIComponent(reportId)}`;
    } else {
      const birthDataRaw = sessionStorage.getItem("taiji_birth_data");
      if (birthDataRaw) {
        await handlePreviewGeneration(JSON.parse(birthDataRaw), reportType);
      } else {
        window.location.href = "/generator";
      }
    }
  }

  async function getChart(): Promise<NatalChart | null> {
    const cached = sessionStorage.getItem("taiji_chart_json");
    if (cached) return JSON.parse(cached);
    const birthRaw = sessionStorage.getItem("taiji_birth_data");
    if (birthRaw) {
      const birth = JSON.parse(birthRaw) as BirthData;
      const chart = await calculateNatalChart(birth);
      sessionStorage.setItem("taiji_chart_json", JSON.stringify(chart));
      return chart;
    }
    return null;
  }

  async function handlePaypalCapture(orderId: string, token: string, reportId: string | null, reportType: string) {
    try {
      setStatusText(t("confirmingPayment"));
      const result = await capturePayPalOrder(orderId, token);
      if (result.unlocked) {
        trackFbPurchase({ eventId: orderId, value: 0, currency: "USD" });
        trackEvent("pay_success", true);
        if (reportId) {
          await generateAiReport(reportId, reportType);
        }
        window.location.href = `/generator/final-report?reportType=${encodeURIComponent(reportType)}&reportId=${encodeURIComponent(reportId || "")}`;
      } else {
        window.location.href = `/generator/final-report?reportType=${encodeURIComponent(reportType)}&reportId=${encodeURIComponent(reportId || "")}`;
      }
    } catch (e) {
      console.error("PayPal capture error:", e);
      window.location.href = `/generator/final-report?reportType=${encodeURIComponent(reportType)}&reportId=${encodeURIComponent(reportId || "")}`;
    }
  }

  async function handlePaidGeneration(orderId: string, reportId: string, reportType: string) {
    try {
      setStatusText(t("confirmingPayment"));
      for (let i = 0; i < 30; i++) {
        const status = await getOrderStatus(orderId).catch(() => null);
        if (status?.unlocked || status?.status === "paid") {
          trackFbPurchase({ eventId: orderId, value: status?.amount ? status.amount / 100 : 0, currency: "USD" });
          await generateAiReport(reportId, reportType);
          window.location.href = `/generator/final-report?reportType=${encodeURIComponent(reportType)}&reportId=${encodeURIComponent(reportId)}`;
          return;
        }
        await new Promise(r => setTimeout(r, 2000));
      }
      window.location.href = `/generator/final-report?reportType=${encodeURIComponent(reportType)}&reportId=${encodeURIComponent(reportId)}`;
    } catch (e) {
      console.error("Error in paid generation:", e);
      window.location.href = `/generator/final-report?reportType=${encodeURIComponent(reportType)}&reportId=${encodeURIComponent(reportId)}`;
    }
  }

  async function generateAiReport(reportId: string, reportType: string) {
    sessionStorage.setItem("ai_gen_started", Date.now().toString());
    setStatusText(t("preparingReport"));
    const totalSec = 180 + Math.floor(Math.random() * 21);
    setCountdown(totalSec);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 0) { return 0; }
        return parseFloat((prev - 0.1).toFixed(1));
      });
    }, 100);
    const chart = await getChart();
    if (!chart) {
      const ac = new AbortController();
      const to = setTimeout(() => ac.abort(), 30000);
      const serverData = await fetchReportFromServer(reportId, ac.signal).catch(() => null);
      clearTimeout(to);
      if (serverData?.chartJson) {
        sessionStorage.setItem("taiji_chart_json", JSON.stringify(serverData.chartJson));
      }
    }
    const finalChart = await getChart();
    if (!finalChart) return;
    const { generateReportText } = await import("../services/reportGenerator");
    const preview = await import("../services/reportStore").then(m => m.loadPreviewReportText(reportType as any));
    try {
      const aiText = await generateReportText(finalChart, reportType as any, (c) => setCharCount(c), preview, i18n.language);
      if (aiText.trim()) {
        saveReportText(aiText, reportType as any);
        markAiReportDone(reportType as any);
        trackEvent("report_success", true);
      }
    } catch (e) {
      console.error("AI generation error:", e);
    } finally {
      if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
      sessionStorage.removeItem("ai_gen_started");
    }
  }

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

      const { computeReportId } = await import("../services/reportId");
      const rid = await computeReportId(birthData, reportType as any);
      saveReportId(rid, reportType as any);

      await saveReportToServer({ reportId: rid, reportText: text, chartJson: natalChart, displayName: birthData.name || undefined, reportType: reportType as any }).catch(() => {});

      window.location.href = `/generator/final-report?reportType=${encodeURIComponent(reportType)}&reportId=${encodeURIComponent(rid)}`;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("Error generating preview:", e);
      alert(t("genReportError", { message: msg }));
      window.location.href = "/generator";
    }
  }

  return (
    <div className="prism-root min-h-screen relative overflow-hidden">
      <PrismBackground />
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <PrismAnalysisAnimation charCount={charCount} countdown={countdown} />
        {statusText && (
          <p className="text-sm" style={{ color: "var(--prism-cream)" }}>{statusText}</p>
        )}
      </div>
    </div>
  );
}
