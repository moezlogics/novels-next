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
  const [active, setActive] = useState<string | null>(null);
  const [asked, setAsked] = useState<{ key: string; i: number; n: number } | null>(null);
  const used = useRef(new Map<string, number>());

  const handle = useCallback((c: ReaderCommand) => {
    used.current.set(c.spec.key, Date.now());
    setList((l) => {
      if (l.some((x) => x.key === c.spec.key)) return l; // keep the same frame (never move it: moving reloads it)
      let next = [...l, c.spec];
      while (next.length > KEEP) {
        const oldest = next.reduce((a, b) => ((used.current.get(a.key) || 0) <= (used.current.get(b.key) || 0) ? a : b));
        next = next.filter((x) => x !== oldest);
      }
      return next;
    });
    if (c.type === "open") {
      setActive(c.spec.key);
      setAsked({ key: c.spec.key, i: c.spec.start || 0, n: Date.now() });
    }
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
          key={r.key}
          pid={r.pid}
          items={r.items}
          requested={asked && asked.key === r.key ? asked : null}
          title={r.title}
          cover={r.cover}
          totalPages={r.totalPages}
          visible={active === r.key}
          onClose={() => setActive((a) => (a === r.key ? null : a))}
          onDownload={(id) => {
            const it = r.items.find((x) => x.driveId === id);
            const multi = r.items.length > 1;
            void downloadDrive({ driveId: id, size: !multi ? r.dl?.size : 0, filename: pdfFilename(multi && it ? `${r.title} ${it.label}` : r.title, r.dl?.site || "") });
          }}
        />
      ))}
    </>
  );
}
