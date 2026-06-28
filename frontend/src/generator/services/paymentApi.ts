const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "";

export const PAYMENT_DISABLED = import.meta.env.VITE_PAYMENT_DISABLED === "true";

export type PaymentMode = "mock" | "paypal" | "disabled";

export function getPaymentLabels(mode: PaymentMode | null | undefined) {
  switch (mode) {
    case "paypal":
      return {
        name: "PayPal",
        paying: "Redirecting to PayPal…",
        button: "Pay with PayPal",
        buttonColor: "#0070ba",
      };
    default:
      return {
        name: "Mock",
        paying: "Processing mock payment…",
        button: "Mock Payment Unlock",
        buttonColor: "#5B3A8C",
      };
  }
}

export interface UnlockStatus {
  unlocked: boolean;
  reportId: string;
  hasReport?: boolean;
  orderId?: string;
  paidAt?: number;
  tradeNo?: string;
  payerContact?: string;
}

export interface ReportOrderInfo {
  orderId: string;
  reportId: string;
  status: "pending" | "paid" | "closed";
  amount?: number;
  amountYuan?: string;
  title?: string;
  tradeNo?: string;
  payerContact?: string;
  createdAt?: number;
  paidAt?: number;
}

export interface CreateOrderResponse {
  orderId?: string;
  reportId: string;
  amount?: number;
  amountYuan?: string;
  title?: string;
  payUrl?: string;
  channel?: string;
  paymentMode?: PaymentMode;
  alreadyUnlocked?: boolean;
  paypalOrderId?: string;
  hint?: string;
  error?: string;
}

export interface OrderStatusResponse {
  orderId: string;
  reportId: string;
  status: "pending" | "paid" | "closed";
  unlocked: boolean;
  paidAt?: number;
  amount?: number;
  amountYuan?: string;
  tradeNo?: string;
  payerContact?: string;
}

async function parseJson<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const payload = data as { error?: string; message?: string };
    const msg = payload.error || payload.message;
    if (res.status === 500 && !msg) {
      throw new Error(
        "Payment service error (500). Make sure the backend is running and tables are created."
      );
    }
    throw new Error(msg || `Request failed ${res.status}`);
  }
  return data as T;
}

export async function checkUnlock(reportId: string): Promise<UnlockStatus> {
  const res = await fetch(`${API_BASE}/api/unlock/${encodeURIComponent(reportId)}`);
  return parseJson(res);
}

export async function createOrder(
  reportId: string,
  options?: { payerContact?: string; reportType?: string; fbp?: string; fbc?: string; eventSourceUrl?: string }
): Promise<CreateOrderResponse> {
  const res = await fetch(`${API_BASE}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reportId,
      payerContact: options?.payerContact,
      reportType: options?.reportType,
      fbp: options?.fbp,
      fbc: options?.fbc,
      eventSourceUrl: options?.eventSourceUrl,
    }),
  });
  return parseJson(res);
}

export async function listReportOrders(reportId: string): Promise<{
  reportId: string;
  unlocked: boolean;
  orderId?: string;
  orders: ReportOrderInfo[];
}> {
  const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(reportId)}/orders`);
  return parseJson(res);
}

export async function getOrderStatus(orderId: string): Promise<OrderStatusResponse> {
  const res = await fetch(`${API_BASE}/api/orders/${encodeURIComponent(orderId)}`);
  return parseJson(res);
}

export async function capturePayPalOrder(orderId: string, paypalOrderId: string): Promise<{ ok: boolean; orderId: string; reportId: string; unlocked: boolean }> {
  const res = await fetch(`${API_BASE}/api/paypal/capture`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId, paypalOrderId }),
  });
  return parseJson(res);
}

export interface HealthResponse {
  ok: boolean;
  paymentMode?: PaymentMode;
  paypalConfigured?: boolean;
  database?: string;
  runtime?: string;
  priceYuan?: string;
  priceCents?: number;
}

export async function ensurePaymentSchema(): Promise<void> {
  const res = await fetch(`${API_BASE}/api/dev/ensure-schema`, { method: "POST" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const payload = data as { error?: string; message?: string };
    throw new Error(payload.error || payload.message || `Schema creation failed ${res.status}`);
  }
}

export async function mockCompleteOrder(orderId: string): Promise<{ ok: boolean; unlocked: boolean; orderId: string; reportId: string }> {
  const res = await fetch(`${API_BASE}/api/dev/mock-pay/${encodeURIComponent(orderId)}/instant`, {
    method: "POST",
    headers: { Accept: "application/json" },
  });
  return parseJson(res);
}

export async function checkHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/api/health`);
  return parseJson(res);
}
