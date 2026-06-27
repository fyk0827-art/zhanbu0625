import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  checkUnlock,
  checkHealth,
  createOrder,
  getOrderStatus,
  capturePayPalOrder,
  mockCompleteOrder,
  ensurePaymentSchema,
  PAYMENT_DISABLED,
  type PaymentMode,
} from "../services/paymentApi";
import { trackEvent, getFbpCookie, getFbcCookie } from "../services/tracking";
import type { ReportTypeId } from "../types/reportTypes";
import {
  getRouterSearchParams,
  stripRouterPaymentParams,
} from "../utils/routerQuery";

const POLL_INTERVAL_MS = 2000;
const POLL_MAX_ATTEMPTS = 30;

export function useReportUnlock(
  reportId: string | null,
  options?: { reportType?: ReportTypeId }
) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paidAt, setPaidAt] = useState<number | null>(null);
  const [tradeNo, setTradeNo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingReturn, setConfirmingReturn] = useState(false);
  const [pollExhausted, setPollExhausted] = useState(false);
  const [paymentMode, setPaymentMode] = useState<PaymentMode | null>(
    PAYMENT_DISABLED ? "disabled" : null
  );
  const [paypalOrderId, setPaypalOrderId] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (PAYMENT_DISABLED) return;
    checkHealth()
      .then((h) => {
        const mode = h.paymentMode ?? "mock";
        setPaymentMode(mode);
        if (mode === "disabled") {
          setIsUnlocked(true);
          setLoading(false);
        }
      })
      .catch(() => setPaymentMode("mock"));
  }, []);

  const refresh = useCallback(async () => {
    if (PAYMENT_DISABLED) {
      setLoading(false);
      return;
    }
    if (!reportId) {
      setLoading(false);
      return;
    }
    try {
      const res = await checkUnlock(reportId);
      setIsUnlocked(res.unlocked || paymentMode === "disabled");
      setOrderId(res.orderId ?? null);
      setPaidAt(res.paidAt ?? null);
      setTradeNo(res.tradeNo ?? null);
    } catch {
      if (!PAYMENT_DISABLED) setIsUnlocked(false);
    } finally {
      setLoading(false);
    }
  }, [reportId, paymentMode]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (PAYMENT_DISABLED) return;
    const params = getRouterSearchParams();
    const pendingOrderId = params.get("orderId") || params.get("out_trade_no");
    if (!pendingOrderId) return;

    let cancelled = false;
    setPollExhausted(false);

    (async () => {
      let mode: PaymentMode = "mock";
      try {
        const health = await checkHealth();
        mode = health.paymentMode ?? "mock";
        if (!cancelled) setPaymentMode(mode);
      } catch {
        mode = "mock";
      }

      if (mode === "paypal") {
        const token = params.get("token");
        if (token) {
          try {
            await capturePayPalOrder(pendingOrderId, token);
            trackEvent("pay_success", true);
          } catch (e) {
            trackEvent("pay_fail", true);
            if (!cancelled) {
      setError(e instanceof Error ? e.message : "PayPal payment confirmation failed");
            }
          }
        }
      }

      for (let i = 0; i < POLL_MAX_ATTEMPTS && !cancelled; i++) {
        try {
          const o = await getOrderStatus(pendingOrderId);
          if (o.unlocked || o.status === "paid") {
            setIsUnlocked(true);
            setOrderId(o.orderId);
            setPaidAt(o.paidAt ?? null);
            trackEvent("pay_success", true);
            stripRouterPaymentParams();
            return;
          }
        } catch (e) {
          if (i === 0 && !cancelled) {
            setError(
              e instanceof Error
                ? e.message
                : t("paymentServiceError")
            );
          }
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }
      if (!cancelled) setPollExhausted(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const startPay = useCallback(async () => {
    if (PAYMENT_DISABLED) return;
    if (!reportId) {
      setError(t("cannotIdentifyReport"));
      return;
    }
    setPaying(true);
    setError(null);
    setPollExhausted(false);
    trackEvent("pay_click", true);
    try {
      let res;
      try {
        const userEmail = typeof window !== "undefined" ? localStorage.getItem("userEmail") || undefined : undefined;
        const fbp = getFbpCookie();
        const fbc = getFbcCookie();
        res = await createOrder(reportId, { reportType: options?.reportType, payerContact: userEmail });
      } catch (firstErr) {
        const msg = firstErr instanceof Error ? firstErr.message : "";
        if (/orders|unlocks|数据库|Database|500/.test(msg)) {
          await ensurePaymentSchema();
          const userEmail = typeof window !== "undefined" ? localStorage.getItem("userEmail") || undefined : undefined;
          res = await createOrder(reportId, { reportType: options?.reportType, payerContact: userEmail });
        } else {
          throw firstErr;
        }
      }
      const mode = res.paymentMode ?? paymentMode ?? "mock";
      if (res.paymentMode) setPaymentMode(res.paymentMode);
      if (res.alreadyUnlocked) {
        setIsUnlocked(true);
        if (res.orderId) setOrderId(res.orderId);
        await refresh();
        return;
      }
      if (!res.orderId) throw new Error(t("noOrderId"));

      if (mode === "mock") {
        const paid = await mockCompleteOrder(res.orderId);
        if (paid.unlocked) {
          setIsUnlocked(true);
          setOrderId(paid.orderId);
          trackEvent("pay_success", true);
          await refresh();
        }
        return;
      }

      if (res.payUrl) {
        window.location.href = res.payUrl;
        return;
      }
      throw new Error(t("noPayUrl"));
    } catch (e) {
      trackEvent("pay_fail", true);
      setError(e instanceof Error ? e.message : t("createOrderFailed"));
    } finally {
      setPaying(false);
    }
  }, [reportId, paymentMode, options?.reportType, refresh]);

  const handlePaypalApprove = useCallback(async (ppOrderId: string) => {
    if (!orderId) return;
    setPaying(true);
    try {
      const result = await capturePayPalOrder(orderId, ppOrderId);
      if (result.unlocked) {
        setIsUnlocked(true);
        setOrderId(result.orderId);
        await refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "PayPal payment confirmation failed");
    } finally {
      setPaying(false);
    }
  }, [orderId, refresh]);

  return {
    isUnlocked,
    isPaid: isUnlocked && Boolean(paidAt ?? orderId),
    orderId,
    paidAt,
    tradeNo,
    loading,
    paying,
    error,
    paymentMode,
    confirmingReturn,
    pollExhausted,
    startPay,
    handlePaypalApprove,
    setPaying,
    refresh,
  };
}
