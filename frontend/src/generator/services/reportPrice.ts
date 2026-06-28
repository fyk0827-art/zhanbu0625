const CACHE_KEY = "cached_report_price";

export function getReportPriceYuan(): string | null {
  try {
    return localStorage.getItem(CACHE_KEY);
  } catch {
    return null;
  }
}

export function getCachedPrice(): string {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) return cached;
  } catch {}
  return "29.90";
}

export async function fetchReportPrice(): Promise<string> {
  const cached = getReportPriceYuan();
  if (cached) return cached;
  try {
    const res = await fetch(`/api/health`);
    const data = await res.json();
    if (data.priceYuan) {
      try { localStorage.setItem(CACHE_KEY, data.priceYuan); } catch {}
      return data.priceYuan;
    }
    return cached || "29.90";
  } catch {
    return cached || "29.90";
  }
}

export function setReportPriceYuan(price: string) {
  try { localStorage.setItem(CACHE_KEY, price); } catch {}
}
