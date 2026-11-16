// Shared helpers (safe for both server and client).

export function slugify(input: string): string {
  return String(input || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Extract a Google Drive file id from any share / view / open URL. */
export function extractDriveId(url: string | null | undefined): string | null {
  if (!url) return null;
  const m =
    url.match(/\/d\/([a-zA-Z0-9_-]{25,})/) ||
    url.match(/[?&]id=([a-zA-Z0-9_-]{25,})/) ||
    url.match(/open\?id=([a-zA-Z0-9_-]{25,})/);
  return m ? m[1] : null;
}

export function stripTags(html: string): string {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function excerpt(html: string, len = 155): string {
  const t = stripTags(html);
  return t.length > len ? t.slice(0, len) : t;
}

export function hexToRgb(hex: string): string {
  let h = String(hex || "#000000").replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16) || 0;
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

/** Turn a stored path (images/x.webp, ../images/x.webp, https://…) into a site-relative URL. */
export function mediaUrl(path: string | null | undefined): string {
  const p = String(path || "").trim();
  if (!p) return "";
  if (/^(https?:)?\/\//i.test(p) || p.startsWith("data:")) return p;
  return "/" + p.replace(/^(\.\.\/)+/, "").replace(/^\/+/, "");
}

/** Pick the generated -w200 / -w400 variant for covers (falls back to the original). */
export function thumbUrl(path: string | null | undefined, width: 200 | 400 = 400): string {
  const u = mediaUrl(path);
  if (!u || !u.startsWith("/images/") || !/\.webp$/i.test(u) || /-w\d+\.webp$/i.test(u)) return u;
  return u.replace(/\.webp$/i, `-w${width}.webp`);
}

export function placeholderCover(label = "Novel"): string {
  const safe = String(label).slice(0, 24).replace(/[<&>"]/g, "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300" viewBox="0 0 200 300"><rect width="200" height="300" fill="#004d5e"/><text x="100" y="150" fill="#fff" font-family="system-ui,sans-serif" font-size="14" text-anchor="middle">${safe}</text></svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

export function letterImage(name: string): string {
  const ch = (String(name || "?").trim()[0] || "?").toUpperCase().replace(/[<&>"]/g, "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150"><rect width="150" height="150" fill="#004d5e"/><text x="75" y="97" font-family="sans-serif" font-size="64" font-weight="700" fill="#fff" text-anchor="middle">${ch}</text></svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
}

export const AVATAR_COLORS = ["#0284c7", "#0d9488", "#059669", "#7c3aed", "#db2777", "#ea580c", "#e11d48", "#2563eb"];

/** Same colour picker as PHP (crc32 of lowercase name). */
export function avatarColor(name: string): string {
  const s = String(name || "").trim().toLowerCase();
  let crc = 0 ^ -1;
  for (let i = 0; i < s.length; i++) {
    let c = (crc ^ s.charCodeAt(i)) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  crc = (crc ^ -1) >>> 0;
  // PHP crc32 returns unsigned on 64-bit; abs() keeps it positive
  return AVATAR_COLORS[crc % AVATAR_COLORS.length];
}

export function initial(name: string): string {
  return (String(name || "G").trim().charAt(0) || "G").toUpperCase();
}

export function formatDate(d: Date | string | number, withTime = true): string {
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = String(dt.getDate()).padStart(2, "0");
  let out = `${day} ${months[dt.getMonth()]} ${dt.getFullYear()}`;
  if (withTime) {
    let h = dt.getHours();
    const ap = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    out += `, ${String(h).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")} ${ap}`;
  }
  return out;
}

export function timeAgo(d: Date | string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(d).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const dd = Math.floor(h / 24);
  if (dd < 30) return `${dd}d ago`;
  return formatDate(d, false);
}

export function money(n: number): string {
  return "Rs " + Math.round(Number(n) || 0).toLocaleString("en-PK");
}

/** Never allow H1 inside body content + drop empty headings (same as single.php). */
export function cleanDescription(html: string): string {
  return String(html || "")
    .replace(/<h1(\s[^>]*)?>/gi, "<h2$1>")
    .replace(/<\/h1>/gi, "</h2>")
    .replace(/<h([2-6])(\s[^>]*)?>\s*(?:&nbsp;|\s|<br\s*\/?>)*<\/h\1>/gi, "");
}

/** Normalise WhatsApp numbers: 03xxxxxxxxx → 923xxxxxxxxx */
export function whatsappUrl(num: string): string {
  let d = String(num || "").replace(/\D+/g, "");
  if (/^03\d{9}$/.test(d)) d = "92" + d.slice(1);
  return d ? `https://wa.me/${d}` : "";
}

export function normalizeSocial(url: string): string {
  const u = String(url || "").trim();
  if (!u) return "";
  return /^https?:\/\//i.test(u) ? u : "https://" + u.replace(/^\/+/, "");
}

/** Menu URLs are stored like "about/" or full URLs — make them site-relative. */
export function menuHref(url: string): string {
  const u = String(url || "").trim();
  if (/^(https?:|#|mailto:|tel:)/i.test(u)) {
    // Old absolute links to the live domain → keep path so they work on any host
    try {
      const parsed = new URL(u);
      if (/kitabnagri\./i.test(parsed.hostname)) return parsed.pathname + parsed.search + parsed.hash;
    } catch {}
    return u;
  }
  const clean = u.replace(/^\/+/, "");
  if (!clean) return "/";
  if (/\.php|[?#]/.test(clean) || clean.endsWith("/")) return "/" + clean;
  return "/" + clean + "/";
}

export function postLink(slug: string): string {
  return `/${slug}/`;
}
