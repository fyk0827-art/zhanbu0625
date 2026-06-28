const CACHE_KEY = "cached_report_price";

export function getCachedPrice(): string {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) return cached;
  } catch {}
  return "29.90";
}

export async function fetchReportPrice(): Promise<string> {
  try {
    const res = await fetch(`/api/health`);
    const data = await res.json();
    if (data.priceYuan) {
      try { localStorage.setItem(CACHE_KEY, data.priceYuan); } catch {}
      return data.priceYuan;
    }
  } catch {}
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) return cached;
  } catch {}
  return "29.90";
}

export function setReportPriceYuan(price: string) {
  try { localStorage.setItem(CACHE_KEY, price); } catch {}
}
