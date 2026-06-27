const tracked = new Set<string>();

export function trackEvent(name: string, once = false) {
  if (once && tracked.has(name)) return;
  if (once) tracked.add(name);
  try {
    (window as any).LA?.track?.(name);
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
