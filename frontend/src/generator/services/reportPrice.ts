let cachedPriceYuan: string | null = null;

export function getReportPriceYuan(): string | null {
  return cachedPriceYuan;
}

export async function fetchReportPrice(): Promise<string> {
  if (cachedPriceYuan) return cachedPriceYuan;
  try {
    const res = await fetch(`/api/health`);
    const data = await res.json();
    if (data.priceYuan) {
      cachedPriceYuan = data.priceYuan;
    }
    return cachedPriceYuan || "29.90";
  } catch {
    return "29.90";
  }
}

export function setReportPriceYuan(price: string) {
  cachedPriceYuan = price;
}
