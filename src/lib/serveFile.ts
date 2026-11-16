import "server-only";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { storagePath } from "./storage";

const TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".txt": "text/plain; charset=utf-8",
};

/** Serve a file from STORAGE_DIR. Missing "-w200/-w400" thumbs are generated on the fly. */
export async function serveStorage(req: Request, rel: string): Promise<Response> {
  const abs = storagePath(rel);
  if (!abs || /\.(php\d?|phtml|js|html?)$/i.test(abs)) return new Response("Not found", { status: 404 });

  let st = await fsp.stat(abs).catch(() => null);
  if (!st) {
    const m = abs.match(/^(.*)-w(\d{2,4})\.webp$/i);
    if (m) {
      const w = Math.min(1200, parseInt(m[2], 10));
      const src = await findOriginal(m[1]);
      if (src) {
        try {
          const sharp = (await import("sharp")).default;
          await sharp(src).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: 74 }).toFile(abs);
          st = await fsp.stat(abs).catch(() => null);
        } catch {}
      }
    }
  }
  if (!st || !st.isFile()) return new Response("Not found", { status: 404 });

  const ext = path.extname(abs).toLowerCase();
  const type = TYPES[ext] || "application/octet-stream";
  const etag = `"${st.size.toString(16)}-${Math.floor(st.mtimeMs).toString(16)}"`;
  const headers: Record<string, string> = {
    "Content-Type": type,
    "Cache-Control": "public, max-age=2592000, stale-while-revalidate=86400",
    ETag: etag,
    "Accept-Ranges": "bytes",
    "X-Content-Type-Options": "nosniff",
  };
  if (ext === ".svg") headers["Content-Security-Policy"] = "script-src 'none'";
  if (req.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers });

  const range = req.headers.get("range");
  if (range && /^bytes=\d*-\d*$/.test(range)) {
    const [a, b] = range.replace("bytes=", "").split("-");
    const start = a ? parseInt(a, 10) : Math.max(0, st.size - parseInt(b, 10));
    const end = a && b ? Math.min(parseInt(b, 10), st.size - 1) : st.size - 1;
    if (start > end || start >= st.size) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${st.size}` } });
    return new Response(nodeStream(abs, start, end), {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${st.size}`, "Content-Length": String(end - start + 1) },
    });
  }
  return new Response(nodeStream(abs, 0, st.size - 1), { headers: { ...headers, "Content-Length": String(st.size) } });
}

async function findOriginal(stemAbs: string): Promise<string | null> {
  for (const ext of [".webp", ".jpg", ".jpeg", ".png", ".gif"]) {
    const p = stemAbs + ext;
    if (await fsp.stat(p).catch(() => null)) return p;
  }
  return null;
}

export function nodeStream(abs: string, start: number, end: number): ReadableStream<Uint8Array> {
  // toWeb keeps Node backpressure, so big PDFs never pile up in memory
  const rs = fs.createReadStream(abs, { start, end, highWaterMark: 256 * 1024 });
  return Readable.toWeb(rs) as unknown as ReadableStream<Uint8Array>;
}
