export interface Subscriber {
  email: string;
  date: string;
}

const KEY = 'shopease_newsletter';

/** Newsletter emails collected by the promo banner (all in localStorage). */
export function readSubscribers(): Subscriber[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSubscriber(email: string): boolean {
  email = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  try {
    const list = readSubscribers();
    if (list.some((s) => s.email === email)) return true;
    list.unshift({ email, date: new Date().toISOString() });
    localStorage.setItem(KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

export function deleteSubscriber(email: string): void {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify(readSubscribers().filter((s) => s.email !== email))
    );
  } catch { /* ignore */ }
}
