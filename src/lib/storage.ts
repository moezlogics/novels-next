import "server-only";
import path from "node:path";
import fs from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { col, nextId } from "./db";
import { slugify } from "./utils";

export function storageDir(...parts: string[]) {
  const base = path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.STORAGE_DIR || "./storage");
  return path.join(/*turbopackIgnore: true*/ base, ...parts);
}

/** Resolve "images/foo.webp" safely inside storage (blocks ../ escapes). */
export function storagePath(rel: string): string | null {
  const base = storageDir();
  const abs = path.resolve(/*turbopackIgnore: true*/ base, rel.replace(/^\/+/, ""));
  return abs.startsWith(base + path.sep) ? abs : null;
}

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|avif|svg)$/i;

export interface SavedImage {
  id: number;
  path: string; // "images/123-abc-name.webp"
  width: number;
  height: number;
}

/**
 * Store an uploaded image the same way the PHP admin did:
 * {mediaId}-{uniq}-{seo-name}.webp + -w200 / -w400 variants, and a media row.
 */
export async function saveImage(file: File, opts: { dir?: "images" | "uploads/community"; alt?: string; prefix?: string; maxWidth?: number } = {}): Promise<SavedImage> {
  const dir = opts.dir || "images";
  const original = file.name || "image";
  if (!IMAGE_EXT.test(original) && !/^image\//.test(file.type)) throw new Error("Only image files are allowed");
  if (file.size > 15 * 1024 * 1024) throw new Error("Image is larger than 15 MB");

  const buf = Buffer.from(await file.arrayBuffer());
  const sharp = (await import("sharp")).default;
  const id = await nextId("media");
  const base = slugify(original.replace(/\.[^.]+$/, "")).slice(0, 80) || "image";
  const uniq = randomBytes(6).toString("hex").slice(0, 13);
  const stem = `${opts.prefix ? opts.prefix + "_" : id + "-"}${uniq}-${base}`;
  const outDir = storageDir(dir);
  await fs.mkdir(outDir, { recursive: true });

  const isSvg = /\.svg$/i.test(original) || file.type === "image/svg+xml";
  let rel: string;
  let width = 0;
  let height = 0;
  if (isSvg) {
    rel = `${dir}/${stem}.svg`;
    await fs.writeFile(path.join(outDir, `${stem}.svg`), buf);
  } else {
    const img = sharp(buf, { animated: false }).rotate();
    const pipeline = opts.maxWidth ? img.resize({ width: opts.maxWidth, withoutEnlargement: true }) : img;
    const out = await pipeline.webp({ quality: 80 }).toBuffer({ resolveWithObject: true });
    width = out.info.width;
    height = out.info.height;
    rel = `${dir}/${stem}.webp`;
    await fs.writeFile(path.join(outDir, `${stem}.webp`), out.data);
    for (const w of [200, 400]) {
      if (width > w) {
        const v = await sharp(out.data).resize({ width: w }).webp({ quality: 74 }).toBuffer();
        await fs.writeFile(path.join(outDir, `${stem}-w${w}.webp`), v);
      }
    }
  }

  await (await col.media()).insertOne({
    _id: id,
    filename: path.basename(rel),
    original_name: original,
    path: rel,
    alt_text: opts.alt || base.replace(/-/g, " "),
    caption: "",
    description: "",
    mime: isSvg ? "image/svg+xml" : "image/webp",
    filesize: buf.length,
    width,
    height,
    created_at: new Date(),
  });
  return { id, path: rel, width, height };
}

export async function deleteStoredFile(rel: string) {
  const abs = storagePath(rel);
  if (!abs) return;
  await fs.rm(abs, { force: true });
  if (/\.webp$/i.test(abs)) {
    await fs.rm(abs.replace(/\.webp$/i, "-w200.webp"), { force: true });
    await fs.rm(abs.replace(/\.webp$/i, "-w400.webp"), { force: true });
  }
}

export async function saveVideo(file: File): Promise<string> {
  if (!/\.(mp4|webm|mov)$/i.test(file.name)) throw new Error("Only MP4 / WebM / MOV videos are allowed");
  if (file.size > 50 * 1024 * 1024) throw new Error("Video is larger than 50 MB");
  const dir = storageDir("uploads", "shop");
  await fs.mkdir(dir, { recursive: true });
  const name = `video_${randomBytes(8).toString("hex")}${path.extname(file.name).toLowerCase()}`;
  await fs.writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return `uploads/shop/${name}`;
}
