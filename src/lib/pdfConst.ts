/** Google Drive's own viewer (Google renders the pages on its servers). */
export function drivePreviewUrl(driveId: string) {
  return `https://drive.google.com/file/d/${encodeURIComponent(driveId)}/preview`;
}

/** Direct Google download (browser navigation, not fetch) — no load on our server. */
export function driveDownloadUrl(driveId: string) {
  return `https://drive.usercontent.google.com/download?id=${encodeURIComponent(driveId)}&export=download&confirm=t`;
}
