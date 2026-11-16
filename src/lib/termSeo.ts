/**
 * Automatic meta for writer and category pages. Used only when the admin left
 * the meta title / description empty. {count} = number of novels, {name} = name.
 * The count is read live, so the description updates when a new novel is added.
 */
import type { Settings } from "./types";
import { fillTitle } from "./settings";

/** "Romantic Novels" → "Romantic" so the title doesn't say "Novels Novels". */
const short = (name: string) => name.replace(/\s+novels?$/i, "").trim() || name;

export const TERM_TEMPLATES = {
  writer: [
    "Read {count} {name} novels online in PDF and download free. Complete list of {name} Urdu novels, new and old, in one place.",
    "{name} has written {count} novels. Read every {name} novel online in PDF or download free, complete and in high quality.",
    "Download {count} {name} novels in PDF free or read online. Romantic, social and complete Urdu novels by {name}, updated regularly.",
  ],
  category: [
    "Read {count} {name} novels online in PDF and download free. Best complete {name} Urdu novels by famous writers, updated regularly.",
    "Explore {count} complete {name} novels. Read online in PDF or download free — new {name} novels added every week.",
    "Find the best {name} novels: {count} complete Urdu novels to read online in PDF and download free.",
  ],
};

/** Replaces {count} and {name}, and fixes "1 novels" → "1 novel". */
export function fillTerm(tpl: string, name: string, count: number) {
  return tpl
    .replace(/\{count\}/gi, String(count))
    .replace(/\{name\}/gi, short(name))
    .replace(/\b1 ((?:[a-z]+ ){0,2})novels\b/gi, "1 $1novel");
}

export function termTitle(s: Settings, kind: "writer" | "category", name: string, manual?: string) {
  if (manual) return manual;
  const tpl = kind === "writer" ? s.seo_tpl_writer : s.seo_tpl_category;
  // a template set in CMS settings still wins; otherwise the built-in one
  if (tpl && tpl.trim() !== "%title%") return fillTitle(s, tpl, { title: name });
  return `Read ${short(name)} Novels in PDF online & Download free`;
}

export function termDescription(kind: "writer" | "category", name: string, count: number, manual?: string) {
  return fillTerm(manual || TERM_TEMPLATES[kind][0], name, count);
}
