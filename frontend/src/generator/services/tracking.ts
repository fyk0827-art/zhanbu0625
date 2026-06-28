const tracked = new Set<string>();

export function trackEvent(name: string, once = false) {
  if (once && tracked.has(name)) return;
  if (once) tracked.add(name);
  try {
    (window as any).LA?.track?.(name);
  } catch {}
}

export function trackFbPurchase({ eventId, value, currency }: { eventId: string; value: number; currency: string }) {
  try {
    const fbq = (window as any).fbq;
    if (typeof fbq === "function") {
      fbq("track", "Purchase", { value, currency }, { eventID: eventId });
    }
  } catch {}
}

export function getFbpCookie(): string | undefined {
  try {
    const match = document.cookie.match(/_fbp=([^;]+)/);
    return match ? match[1] : undefined;
  } catch {
    return undefined;
  }
}

export function getFbcCookie(): string | undefined {
  try {
    const match = document.cookie.match(/_fbc=([^;]+)/);
    return match ? match[1] : undefined;
  } catch {
    return undefined;
  }
}
