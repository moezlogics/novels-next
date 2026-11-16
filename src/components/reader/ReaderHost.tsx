"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { takeQueuedCommands, type ReaderCommand, type ReaderSpec } from "@/lib/readerBus";
import { downloadDrive, pdfFilename } from "@/lib/driveDownload";

const DriveReader = dynamic(() => import("./DriveReader"), { ssr: false });

/** How many novels stay alive in the background (each is a Google viewer). */
const KEEP = 2;

/**
 * One reader for the whole site, placed in the layout so it is never thrown away
 * when the visitor opens another page. Google's viewer keeps its place: leave a
 * novel at page 120, browse around, come back — it is still at page 120.
 * (A full page refresh or closing the tab starts from page 1: the page lives
 * inside Google's frame, which the site cannot read.)
 */
export default function ReaderHost() {
  const [list, setList] = useState<ReaderSpec[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const used = useRef(new Map<number, number>());

  const handle = useCallback((c: ReaderCommand) => {
    used.current.set(c.spec.pid, Date.now());
    setList((l) => {
      if (l.some((x) => x.pid === c.spec.pid)) return l; // keep the same frame (never move it: moving reloads it)
      let next = [...l, c.spec];
      while (next.length > KEEP) {
        const oldest = next.reduce((a, b) => ((used.current.get(a.pid) || 0) <= (used.current.get(b.pid) || 0) ? a : b));
        next = next.filter((x) => x !== oldest);
      }
      return next;
    });
    if (c.type === "open") setActive(c.spec.pid);
  }, []);

  useEffect(() => {
    takeQueuedCommands().forEach(handle);
    const on = (e: Event) => handle((e as CustomEvent<ReaderCommand>).detail);
    window.addEventListener("kn-reader", on);
    return () => window.removeEventListener("kn-reader", on);
  }, [handle]);

  return (
    <>
      {list.map((r) => (
        <DriveReader
          key={r.pid}
          pid={r.pid}
          driveIds={r.driveIds}
          title={r.title}
          cover={r.cover}
          totalPages={r.totalPages}
          visible={active === r.pid}
          onClose={() => setActive((a) => (a === r.pid ? null : a))}
          onDownload={(id) => {
            const n = r.driveIds.indexOf(id);
            const multi = r.driveIds.length > 1;
            void downloadDrive({ driveId: id, size: n === 0 && !multi ? r.dl?.size : 0, filename: pdfFilename(multi ? `${r.title} Part ${n + 1}` : r.title, r.dl?.site || "") });
          }}
        />
      ))}
    </>
  );
}
