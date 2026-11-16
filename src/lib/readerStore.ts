"use client";
// Browser storage — SAME keys as the PHP site (js/site_store.js), so readers keep
// their saved bookmarks and reading progress after the switch to Next.js.

const GUEST_NAME_KEY = "guest_display_name";
const GUEST_ORDERS_KEY = "guest_orders";
const INTENT_KEY = "nvl_reader_intent";
const PREFS_KEY = "kn_reader_prefs";

function get(k: string): string | null {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function set(k: string, v: string) {
  try {
    localStorage.setItem(k, v);
  } catch {}
}
function del(k: string) {
  try {
    localStorage.removeItem(k);
  } catch {}
}

export interface Progress {
  page: number;
  scroll: number;
  zoom: number;
  ts: number;
  total?: number;
}

export function getProgress(pid: number | string): Progress | null {
  try {
    const raw = get(`rdr_pos_${pid}`);
    if (raw) {
      const d = JSON.parse(raw);
      if (d && d.page >= 1) return { page: +d.page || 1, scroll: +d.scroll || 0, zoom: +d.zoom || 1, ts: +d.ts || 0, total: +d.total || 0 };
    }
  } catch {}
  const pg = parseInt(get(`rdr_page_${pid}`) || "", 10);
  return pg > 1 ? { page: pg, scroll: 0, zoom: 1, ts: 0 } : null;
}

export function saveProgress(pid: number | string, p: Progress) {
  set(`rdr_page_${pid}`, String(p.page));
  set(`rdr_pos_${pid}`, JSON.stringify(p));
}

/** Reader opened: remembered for the homepage "Continue Reading" row (keeps a saved page). */
export function markOpened(pid: number | string, total = 0) {
  const p = getProgress(pid);
  saveProgress(pid, { page: p?.page || 1, scroll: 0, zoom: 1, ts: Date.now(), total: total || p?.total || 0 });
}

export function clearProgress(pid: number | string) {
  del(`rdr_page_${pid}`);
  del(`rdr_pos_${pid}`);
}

export function getBookmark(pid: number | string): number | null {
  const n = parseInt(get(`rdr_bm_${pid}`) || "", 10);
  return n > 0 ? n : null;
}
export function setBookmark(pid: number | string, page: number | null) {
  if (page && page > 0) set(`rdr_bm_${pid}`, String(page));
  else del(`rdr_bm_${pid}`);
}

export interface ContinueItem {
  pid: number;
  page: number;
  total: number;
  ts: number;
}

export function listContinue(): ContinueItem[] {
  const map = new Map<number, ContinueItem>();
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) || "";
      const m = k.match(/^rdr_(?:pos|page)_(\d+)$/);
      if (!m) continue;
      const pid = +m[1];
      if (map.has(pid)) continue;
      const p = getProgress(pid);
      if (p && (p.page > 1 || p.ts > 0)) map.set(pid, { pid, page: p.page, total: p.total || 0, ts: p.ts });
    }
  } catch {}
  return [...map.values()].sort((a, b) => b.ts - a.ts);
}

export function listBookmarks(): { pid: number; page: number; ts: number }[] {
  const out: { pid: number; page: number; ts: number }[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) || "";
      const m = k.match(/^rdr_bm_(\d+)$/);
      if (!m) continue;
      const page = getBookmark(m[1]);
      if (page) out.push({ pid: +m[1], page, ts: getProgress(m[1])?.ts || 0 });
    }
  } catch {}
  return out.sort((a, b) => b.ts - a.ts);
}

export function setReaderIntent(pid: number, mode: "saved" | "continue", page = 0) {
  try {
    sessionStorage.setItem(INTENT_KEY, JSON.stringify({ pid, mode, page, ts: Date.now() }));
  } catch {}
}

export function consumeReaderIntent(pid: number): { mode: "saved" | "continue"; page: number } | null {
  try {
    const raw = sessionStorage.getItem(INTENT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (+d.pid !== +pid) return null;
    sessionStorage.removeItem(INTENT_KEY);
    return { mode: d.mode === "saved" ? "saved" : "continue", page: +d.page || 0 };
  } catch {
    return null;
  }
}

export function getGuestName(): string {
  return (get(GUEST_NAME_KEY) || "").trim();
}
export function setGuestName(name: string): string {
  const n = String(name || "").trim().slice(0, 80);
  if (n) set(GUEST_NAME_KEY, n);
  else del(GUEST_NAME_KEY);
  return n;
}

export interface GuestOrder {
  id: number;
  total: number;
  status: string;
  name: string;
  created_at: string;
  items: { title: string; quantity: number; price: number }[];
  tracking_token: string;
}
export function getGuestOrders(): GuestOrder[] {
  try {
    const l = JSON.parse(get(GUEST_ORDERS_KEY) || "[]");
    return Array.isArray(l) ? l : [];
  } catch {
    return [];
  }
}
export function addGuestOrder(o: GuestOrder) {
  const list = getGuestOrders().filter((x) => x.id !== o.id);
  list.unshift(o);
  set(GUEST_ORDERS_KEY, JSON.stringify(list.slice(0, 40)));
}

export interface ReaderPrefs {
  theme: "classic" | "light" | "sepia" | "dark";
  mode: "scroll" | "page";
  brightness: number;
  dataSaver: boolean;
}
export function getPrefs(): ReaderPrefs {
  try {
    const p = JSON.parse(get(PREFS_KEY) || "{}");
    return { theme: ["classic", "light", "sepia", "dark"].includes(p.theme) ? p.theme : "classic", mode: p.mode === "page" ? "page" : "scroll", brightness: Math.min(1, Math.max(0.4, +p.brightness || 1)), dataSaver: !!p.dataSaver };
  } catch {
    return { theme: "classic", mode: "scroll", brightness: 1, dataSaver: false };
  }
}
export function savePrefs(p: ReaderPrefs) {
  set(PREFS_KEY, JSON.stringify(p));
}

/** Guest category affinity (same cookie the community "For You" feed reads). */
export function bumpAffinity(catId: number) {
  if (!catId) return;
  try {
    const key = "guest_category_affinity";
    const a = JSON.parse(get(key) || "{}") || {};
    a[catId] = (parseInt(a[catId], 10) || 0) + 1;
    set(key, JSON.stringify(a));
    document.cookie = `${key}=${encodeURIComponent(JSON.stringify(a))};path=/;max-age=${30 * 86400};SameSite=Lax`;
  } catch {}
}
