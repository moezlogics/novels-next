"use client";

/**
 * Talks to the site-wide reader (ReaderHost in the site layout).
 * The reader lives outside the page, so it survives moving between pages:
 * come back to a novel and Google's viewer is still on the page you left.
 */

export type DlInfo = { apiKey?: string; size?: number; site?: string };
export interface ReaderItem {
  label: string;
  driveId: string;
}
export interface ReaderSpec {
  /** One reader per novel + kind ("main" = complete novel, "ep" = episodes). */
  key: string;
  pid: number;
  items: ReaderItem[];
  /** Which item to show when opening (episode index). */
  start?: number;
  title: string;
  cover: string;
  totalPages: number;
  dl?: DlInfo;
}
export interface ReaderCommand {
  type: "preload" | "open";
  spec: ReaderSpec;
}

type W = Window & { __knReaderQueue?: ReaderCommand[]; __knReaderReady?: boolean };

export function readerCommand(type: ReaderCommand["type"], spec: ReaderSpec) {
  const w = window as W;
  const cmd = { type, spec };
  // the host may not be listening yet on the very first render: queue it
  if (!w.__knReaderReady) (w.__knReaderQueue ??= []).push(cmd);
  else window.dispatchEvent(new CustomEvent<ReaderCommand>("kn-reader", { detail: cmd }));
}

export function takeQueuedCommands(): ReaderCommand[] {
  const w = window as W;
  w.__knReaderReady = true;
  const q = w.__knReaderQueue || [];
  w.__knReaderQueue = [];
  return q;
}
