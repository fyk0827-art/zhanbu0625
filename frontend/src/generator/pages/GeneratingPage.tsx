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

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "";

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
    console.log("[GenPage] run: orderId=" + orderId + " reportId=" + reportId + " reportType=" + reportType + " isPaypalReturn=" + isPaypalReturn);
    setGlobalReportType(reportType);

    if (isPaypalReturn && orderId && token) {
      console.log("[GenPage] path: paypal return, orderId=" + orderId + " reportId=" + reportId);
      await handlePaypalCapture(orderId, token, reportId, reportType);
    } else if (orderId && reportId) {
      console.log("[GenPage] path: paid generation, orderId=" + orderId + " reportId=" + reportId);
      await handlePaidGeneration(orderId, reportId, reportType);
    } else if (reportId) {
      console.log("[GenPage] path: direct to final-report, reportId=" + reportId);
      window.location.href = `/generator/final-report?reportType=${encodeURIComponent(reportType)}&reportId=${encodeURIComponent(reportId)}`;
    } else {
      const birthDataRaw = sessionStorage.getItem("taiji_birth_data");
      if (birthDataRaw) {
        console.log("[GenPage] path: preview generation");
        await handlePreviewGeneration(JSON.parse(birthDataRaw), reportType);
      } else {
        console.log("[GenPage] path: no data, redirect to /generator");
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
    console.log("[GenPage] handlePaypalCapture: orderId=" + orderId + " reportId=" + reportId);
    try {
      setStatusText(t("confirmingPayment"));
      const result = await capturePayPalOrder(orderId, token);
      console.log("[GenPage] capturePayPalOrder done: unlocked=" + result.unlocked);
      if (result.unlocked) {
        trackFbPurchase({ eventId: orderId, value: 0, currency: "USD" });
        trackEvent("pay_success", true);
        if (reportId) {
          await generateAiReport(reportId, reportType);
        }
        const target = `/generator/final-report?reportType=${encodeURIComponent(reportType)}&reportId=${encodeURIComponent(reportId || "")}`;
        console.log("[GenPage] navigate to: " + target);
        window.location.href = target;
      } else {
        const target = `/generator/final-report?reportType=${encodeURIComponent(reportType)}&reportId=${encodeURIComponent(reportId || "")}`;
        console.log("[GenPage] not unlocked, navigate to: " + target);
        window.location.href = target;
      }
    } catch (e) {
      console.error("[GenPage] PayPal capture error:", e);
      const target = `/generator/final-report?reportType=${encodeURIComponent(reportType)}&reportId=${encodeURIComponent(reportId || "")}`;
      window.location.href = target;
    }
  }

  async function handlePaidGeneration(orderId: string, reportId: string, reportType: string) {
    console.log("[GenPage] handlePaidGeneration: orderId=" + orderId + " reportId=" + reportType);
    try {
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
      const serverData = await fetchReportFromServer(reportId).catch(() => null);
      if (serverData?.chartJson) {
        sessionStorage.setItem("taiji_chart_json", JSON.stringify(serverData.chartJson));
      }
    }
    const finalChart = await getChart();
    let systemPrompt = "";
    let userPrompt = "";
    let previewText = "";
    let displayName = "";
    let chartJsonPayload = null;
    let userEmail = typeof window !== "undefined" ? localStorage.getItem("userEmail") || undefined : undefined;
    if (finalChart) {
      try {
        const calcResult = await import("../services/v2ScoringEngine").then(m => m.runV2Calculations(finalChart, "en"));
        const preview = await import("../services/reportStore").then(m => m.loadPreviewReportText(reportType as any));
        const previewEn = preview?.trim() ? await import("../services/birthReport500").then(m => m.generateBirthReport500(finalChart, "en")) : undefined;
        const { buildPromptsForReportType, resolveSystemPrompt } = await import("../services/reportGenerator");
        const { fetchReportPrompts } = await import("../services/reportPromptApi");
        const prompts = buildPromptsForReportType(reportType as any, finalChart, calcResult, previewEn, "en");
        const dbPrompts = await fetchReportPrompts();
        systemPrompt = resolveSystemPrompt(reportType as any, dbPrompts.prompts, "en");
        userPrompt = prompts.user;
        previewText = preview || "";
        displayName = finalChart.birthData?.name || undefined;
        chartJsonPayload = finalChart;
      } catch (e) {
        console.error("[GenPage] Failed to build prompts:", e);
      }
    }
    // 始终提交到后端生成（带 chartJson 作为后备）
    try {
      await fetch(`${API_BASE}/api/reports/${encodeURIComponent(reportId)}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemPrompt, userPrompt, previewText, displayName, userEmail, chartJson: chartJsonPayload }),
      });
      trackEvent("report_submitted", true);
    } catch (e) {
      console.error("[GenPage] Failed to submit generation request:", e);
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

      // 存储会话指纹
      const fingerprint = [
        sessionStorage.getItem("fp_email") || "",
        sessionStorage.getItem("fp_age") || "",
        sessionStorage.getItem("fp_answers") || "",
        birthData.name || "",
        birthData.gender || "",
        birthData.year, birthData.month, birthData.day,
        birthData.hour, birthData.minute,
        birthData.latitude, birthData.longitude,
        birthData.timezone,
      ].map(String).join("|");
      sessionStorage.setItem("fp_hash", btoa(fingerprint));
      console.log("[GenPage] fingerprint saved, len=" + fingerprint.length);

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
