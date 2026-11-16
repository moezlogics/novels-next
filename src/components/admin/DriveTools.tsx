"use client";
import { useState } from "react";
import { extractDriveId } from "@/lib/utils";

/** One click → checks the Drive link is public and fills the file size. */
export default function DriveTools() {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async (e: React.MouseEvent<HTMLButtonElement>) => {
    const form = e.currentTarget.closest("form")!;
    const url = (form.querySelector<HTMLInputElement>('input[name="read_online_url"]')?.value || "").trim();
    const id = extractDriveId(url);
    if (!id) return setMsg("Paste a valid Google Drive link first.");
    setBusy(true);
    setMsg("Checking the file on Google Drive…");
    try {
      const info = await fetch(`/api/pdf/${id}/?info=1`).then((r) => r.json());
      if (!info.size) throw new Error(info.error || "Not reachable");
      const size = form.querySelector<HTMLInputElement>('input[name="file_size"]');
      if (size) size.value = `${(info.size / 1048576).toFixed(1)} MB`;
      const type = form.querySelector<HTMLInputElement>('input[name="file_type"]');
      if (type && !type.value) type.value = "PDF";
      setMsg(`✓ The file is public and ready for the reader · ${(info.size / 1048576).toFixed(1)} MB. Enter the page count by hand.`);
    } catch (err) {
      setMsg(`✗ ${(err as Error).message}. Make sure the file is shared as "Anyone with the link".`);
    }
    setBusy(false);
  };
  return (
    <div className="a-row">
      <button type="button" className="a-btn a-btn-g a-btn-sm" onClick={run} disabled={busy}>
        <i className={`fa-solid ${busy ? "fa-spinner fa-spin" : "fa-wand-magic-sparkles"}`}></i> Check Drive link &amp; size
      </button>
      {msg ? (
        <span className="a-muted" style={{ fontSize: ".8rem" }}>
          {msg}
        </span>
      ) : null}
    </div>
  );
}
