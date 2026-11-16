"use client";
import { driveDownloadUrl } from "./pdfConst";

/**
 * Downloads a public Google Drive PDF straight from Google with the browser's own
 * downloader (it shows progress in the browser and works for any size on phones).
 * Our server is never involved.
 *
 * Google waits 10–30 s before it sends the first byte of a file (even through its
 * official API), so the page tells the reader it is "preparing" meanwhile.
 */

export interface DlProgress {
  loaded: number;
  total: number;
}

export function pdfFilename(title: string, site: string) {
  const clean = (s: string) => s.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim();
  return `${clean(title) || "Novel"}${site ? ` - ${clean(site)}` : ""}.pdf`;
}

export async function downloadDrive(opts: { driveId: string; apiKey?: string; filename?: string; size?: number; onProgress?: (p: DlProgress) => void }): Promise<"browser"> {
  const a = document.createElement("a");
  a.href = driveDownloadUrl(opts.driveId);
  a.rel = "nofollow noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  return "browser";
}
