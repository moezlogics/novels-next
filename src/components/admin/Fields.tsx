"use client";
import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

export function Flash({ ok, err }: { ok?: string; err?: string }) {
  const [show, setShow] = useState(true);
  useEffect(() => {
    if (!ok) return;
    const t = setTimeout(() => setShow(false), 5000);
    // clean the ?ok= from the URL so refresh doesn't repeat it
    try {
      const u = new URL(location.href);
      u.searchParams.delete("ok");
      u.searchParams.delete("err");
      history.replaceState(history.state, "", u.pathname + u.search);
    } catch {}
    return () => clearTimeout(t);
  }, [ok]);
  if (!show || (!ok && !err)) return null;
  return (
    <div className={`a-alert ${err ? "err" : "ok"}`}>
      <i className={`fa-solid ${err ? "fa-triangle-exclamation" : "fa-circle-check"}`}></i> {err || ok}
    </div>
  );
}

export function Submit({ children, className = "a-btn a-btn-p", pendingText = "Saving…", name, value }: { children: React.ReactNode; className?: string; pendingText?: string; name?: string; value?: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={className} disabled={pending} name={name} value={value}>
      {pending ? (
        <>
          <i className="fa-solid fa-spinner fa-spin"></i> {pendingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function ConfirmButton({ message = "Are you sure?", children, className = "a-btn a-btn-d a-btn-sm", name, value }: { message?: string; children: React.ReactNode; className?: string; name?: string; value?: string }) {
  return (
    <button
      className={className}
      name={name}
      value={value}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}

/** Lightweight rich-text editor (replaces Summernote) with an HTML source mode. */
export function RichText({ name, defaultValue = "", minHeight = 320, placeholder }: { name: string; defaultValue?: string; minHeight?: number; placeholder?: string }) {
  const area = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState(defaultValue);
  const [src, setSrc] = useState(false);
  const [lib, setLib] = useState(false);
  useEffect(() => {
    if (area.current && !src) area.current.innerHTML = html;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);
  const exec = (cmd: string, val?: string) => {
    area.current?.focus();
    document.execCommand(cmd, false, val);
    setHtml(area.current?.innerHTML || "");
  };
  const words = html.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
  const B = ({ c, v, t, i }: { c: string; v?: string; t: string; i?: string }) => (
    <button type="button" title={t} onMouseDown={(e) => e.preventDefault()} onClick={() => exec(c, v)}>
      {i ? <i className={`fa-solid ${i}`}></i> : t}
    </button>
  );
  return (
    <div className="rte">
      <div className="rte-bar">
        <select
          onChange={(e) => {
            exec("formatBlock", e.target.value);
            e.target.value = "";
          }}
          defaultValue=""
          title="Heading"
        >
          <option value="" disabled>
            Paragraph
          </option>
          <option value="p">Paragraph</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="h4">Heading 4</option>
          <option value="blockquote">Quote</option>
        </select>
        <span className="rte-sep" />
        <B c="bold" t="Bold" i="fa-bold" />
        <B c="italic" t="Italic" i="fa-italic" />
        <B c="underline" t="Underline" i="fa-underline" />
        <B c="strikeThrough" t="Strike" i="fa-strikethrough" />
        <span className="rte-sep" />
        <B c="insertUnorderedList" t="Bullets" i="fa-list-ul" />
        <B c="insertOrderedList" t="Numbers" i="fa-list-ol" />
        <B c="justifyLeft" t="Left" i="fa-align-left" />
        <B c="justifyCenter" t="Center" i="fa-align-center" />
        <B c="justifyRight" t="Right" i="fa-align-right" />
        <span className="rte-sep" />
        <button
          type="button"
          title="Link"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            const u = prompt("Link URL (https://… or /page/)");
            if (u) exec("createLink", u);
          }}
        >
          <i className="fa-solid fa-link"></i>
        </button>
        <B c="unlink" t="Remove link" i="fa-link-slash" />
        <button type="button" title="Insert image" onMouseDown={(e) => e.preventDefault()} onClick={() => setLib(true)}>
          <i className="fa-solid fa-image"></i>
        </button>
        <B c="insertHorizontalRule" t="Divider" i="fa-minus" />
        <B c="removeFormat" t="Clear formatting" i="fa-eraser" />
        <span className="rte-sep" />
        <button
          type="button"
          className={src ? "on" : ""}
          title="HTML source"
          onClick={() => {
            if (!src) setHtml(area.current?.innerHTML || html);
            setSrc((s) => !s);
          }}
        >
          <i className="fa-solid fa-code"></i>
        </button>
      </div>
      {src ? (
        <textarea className="rte-src" value={html} onChange={(e) => setHtml(e.target.value)} style={{ minHeight }} />
      ) : (
        <div ref={area} className="rte-area" contentEditable suppressContentEditableWarning style={{ minHeight }} data-placeholder={placeholder} onInput={(e) => setHtml((e.target as HTMLDivElement).innerHTML)} onBlur={(e) => setHtml((e.target as HTMLDivElement).innerHTML)} />
      )}
      <div className="rte-count">
        <span>{words} words</span>
        <span>{src ? "HTML mode" : "Visual mode"}</span>
      </div>
      <input type="hidden" name={name} value={html} />
      {lib ? (
        <MediaLibrary
          onClose={() => setLib(false)}
          onPick={(m) => {
            setLib(false);
            if (src) setHtml((h) => `${h}<img src="/${m.path}" alt="${m.alt}">`);
            else exec("insertHTML", `<img src="/${m.path}" alt="${(m.alt || "").replace(/"/g, "")}" loading="lazy">`);
          }}
        />
      ) : null}
    </div>
  );
}

export interface MediaItem {
  id: number;
  path: string;
  alt: string;
  thumb: string;
}

export function MediaLibrary({ onPick, onClose }: { onPick: (m: MediaItem) => void; onClose: () => void }) {
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const load = (s = "") =>
    fetch(`/newlogin/media/api/?q=${encodeURIComponent(s)}`)
      .then((r) => r.json())
      .then((d) => setItems(d.items || []));
  useEffect(() => {
    void load();
  }, []);
  return (
    <div className="a-modal-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="a-modal">
        <div className="a-modal-head">
          <b>Media Library</b>
          <input type="search" placeholder="Search…" value={q} onChange={(e) => (setQ(e.target.value), load(e.target.value))} style={{ maxWidth: 240, marginLeft: 12 }} />
          <span className="a-sp" />
          <label className="a-btn a-btn-p a-btn-sm">
            <i className="fa-solid fa-upload"></i> {busy ? "Uploading…" : "Upload"}
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setBusy(true);
                const fd = new FormData();
                fd.append("file", f);
                const d = await fetch("/newlogin/media/api/", { method: "POST", body: fd }).then((r) => r.json());
                setBusy(false);
                if (d.item) onPick(d.item);
                else alert(d.error || "Upload failed");
              }}
            />
          </label>
          <button type="button" className="a-btn a-btn-g a-btn-sm" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div className="a-modal-body">
          {!items ? (
            <div className="a-empty">Loading…</div>
          ) : !items.length ? (
            <div className="a-empty">No images</div>
          ) : (
            <div className="a-media-grid">
              {items.map((m) => (
                <button type="button" key={m.id} onClick={() => onPick(m)} title={m.alt}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.thumb} alt={m.alt} loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Image input: upload new file OR pick from library; keeps the current path otherwise. */
export function ImageField({ name, current = "", label = "Image", wide = false, help }: { name: string; current?: string; label?: string; wide?: boolean; help?: string }) {
  const [path, setPath] = useState(current);
  const [preview, setPreview] = useState(current ? `/${current.replace(/^\/+/, "")}` : "");
  const [lib, setLib] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="a-field">
      <label>{label}</label>
      <div className="a-img-pick">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className={wide ? "wide" : ""} />
        ) : (
          <div style={{ width: wide ? 180 : 110, height: wide ? 80 : 160, borderRadius: 10, border: "1px dashed rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#777" }}>
            <i className="fa-solid fa-image"></i>
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label className="a-btn a-btn-g a-btn-sm">
            <i className="fa-solid fa-upload"></i> Upload new
            <input
              ref={fileRef}
              type="file"
              name={`${name}_file`}
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setPreview(URL.createObjectURL(f));
              }}
            />
          </label>
          <button type="button" className="a-btn a-btn-g a-btn-sm" onClick={() => setLib(true)}>
            <i className="fa-solid fa-images"></i> Media library
          </button>
          {preview ? (
            <button
              type="button"
              className="a-btn a-btn-d a-btn-xs"
              onClick={() => {
                setPath("");
                setPreview("");
                if (fileRef.current) fileRef.current.value = "";
              }}
            >
              Remove
            </button>
          ) : null}
        </div>
      </div>
      {help ? <small>{help}</small> : null}
      <input type="hidden" name={name} value={path} />
      {lib ? (
        <MediaLibrary
          onClose={() => setLib(false)}
          onPick={(m) => {
            setPath(m.path);
            setPreview(`/${m.path}`);
            if (fileRef.current) fileRef.current.value = "";
            setLib(false);
          }}
        />
      ) : null}
    </div>
  );
}

/** Meta title / description with counters + Google preview. */
const slugPart = (x: string) => x.toLowerCase().trim().replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

/** Novel title and writer name as typed / chosen in the novel form. */
function novelSource() {
  const t = document.querySelector<HTMLInputElement>('input[name="title"]')?.value.trim() || "";
  const nw = document.querySelector<HTMLInputElement>('input[name="new_writer"]')?.value.trim() || "";
  const sel = document.querySelector<HTMLSelectElement>('select[name="writer_id"]');
  const w = nw || (sel && sel.value ? sel.options[sel.selectedIndex].text.trim() : "");
  return { t, w };
}

/** Calls `cb` whenever the title, writer select or new-writer box changes. */
function useNovelSource(active: boolean, cb: (src: { t: string; w: string }) => void) {
  const ref = useRef(cb);
  ref.current = cb;
  useEffect(() => {
    if (!active) return;
    const h = (e: Event) => {
      const n = (e.target as HTMLInputElement | null)?.name;
      if (n === "title" || n === "writer_id" || n === "new_writer") ref.current(novelSource());
    };
    document.addEventListener("input", h);
    document.addEventListener("change", h);
    return () => {
      document.removeEventListener("input", h);
      document.removeEventListener("change", h);
    };
  }, [active]);
}

/** "Azeel" + "Mahi Shah" → "Azeel Novel by Mahi Shah Complete PDF" */
export function novelMetaTitle(t: string, w: string) {
  if (!t) return "";
  const base = /\bnovel$/i.test(t) ? t : `${t} Novel`;
  return w ? `${base} by ${w} Complete PDF` : `${base} Complete PDF`;
}

export function SeoBox({
  title = "",
  description = "",
  url,
  fallbackTitle = "",
  autoNovel = false,
  autoDescription = "",
  templates,
  count,
  name = "",
}: {
  title?: string;
  description?: string;
  url: string;
  fallbackTitle?: string;
  /** new novel: fill the meta title from title + writer until the admin edits it */
  autoNovel?: boolean;
  /** what Google gets when the description is left empty */
  autoDescription?: string;
  /** ready-made descriptions with {count} / {name} (writers & categories) */
  templates?: string[];
  count?: number;
  name?: string;
}) {
  const [t, setT] = useState(title);
  const [d, setD] = useState(description);
  const [tTouched, setTTouched] = useState(!!title || !autoNovel);
  useNovelSource(!tTouched, ({ t: nt, w }) => setT(novelMetaTitle(nt, w)));
  const fill = (x: string) => (count === undefined ? x : x.replace(/\{count\}/gi, String(count)).replace(/\{name\}/gi, name));
  const col = (n: number, max: number) => (n > max ? "#f87171" : n > max * 0.85 ? "#fcd34d" : "#86efac");
  return (
    <>
      <div className="a-field">
        <label>
          Meta Title <span style={{ float: "right", color: col(t.length, 60) }}>{t.length}/60</span>
        </label>
        <input
          type="text"
          name="meta_title"
          value={t}
          onChange={(e) => {
            setTTouched(true);
            setT(e.target.value);
          }} placeholder={fallbackTitle || "Leave empty to use the title"} />
      </div>
      <div className="a-field">
        <label>
          Meta Description <span style={{ float: "right", color: col(d.length, 160) }}>{d.length}/160</span>
        </label>
        <textarea name="meta_description" rows={3} value={d} onChange={(e) => setD(e.target.value)} placeholder={autoDescription ? `Empty = automatic: ${autoDescription}` : "Leave empty to auto-generate from the description"} />
        {templates ? (
          <div className="seo-tpls">
            <small>
              Ready-made (click to use). <code>{"{count}"}</code> = number of novels (updates by itself), <code>{"{name}"}</code> = name.
            </small>
            {templates.map((x, i) => (
              <button type="button" key={i} className="a-btn a-btn-sm a-btn-ghost" onClick={() => setD(x)} title={x}>
                Template {i + 1}
              </button>
            ))}
            {count !== undefined ? (
              <button type="button" className="a-btn a-btn-sm a-btn-ghost" onClick={() => setD((v) => (v.includes("{count}") ? v : `${v.trim()} {count} novels`.trim()))}>
                + {"{count}"}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="seo-preview">
        <div className="u">{url}</div>
        <div className="t">{t || fallbackTitle || "Page title"}</div>
        <div className="d">{fill(d) || autoDescription || "Description will be generated automatically from your content…"}</div>
      </div>
    </>
  );
}

/** Multi-category picker: click to toggle, double-click = primary category. */
export function CategoryPicker({ cats, selected, primary }: { cats: { id: number; name: string }[]; selected: number[]; primary: number | null }) {
  const [sel, setSel] = useState<number[]>(selected);
  const [prim, setPrim] = useState<number | null>(primary ?? selected[0] ?? null);
  const [q, setQ] = useState("");
  const toggle = (id: number) => {
    setSel((s) => {
      const next = s.includes(id) ? s.filter((x) => x !== id) : [...s, id];
      if (!next.includes(prim as number)) setPrim(next[0] ?? null);
      if (!prim && next.length) setPrim(next[0]);
      return next;
    });
  };
  return (
    <div className="a-field">
      <label>Categories</label>
      <input type="search" placeholder="Filter categories…" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 6 }} />
      <div className="a-chips">
        {cats
          .filter((c) => c.name.toLowerCase().includes(q.toLowerCase()))
          .map((c) => (
            <span
              key={c.id}
              className={`a-chip${sel.includes(c.id) ? " on" : ""}${prim === c.id ? " primary" : ""}`}
              onClick={() => toggle(c.id)}
              onDoubleClick={() => {
                if (!sel.includes(c.id)) setSel((s) => [...s, c.id]);
                setPrim(c.id);
              }}
              title="Click to select · double-click to make primary"
            >
              {prim === c.id ? <i className="fa-solid fa-star"></i> : sel.includes(c.id) ? <i className="fa-solid fa-check"></i> : null}
              {c.name}
            </span>
          ))}
      </div>
      <small>Click to select. Double-click a category to make it the main (primary) one — shown with ★.</small>
      <input type="hidden" name="categories" value={sel.join(",")} />
      <input type="hidden" name="primary_category" value={prim ?? ""} />
    </div>
  );
}

export function SlugInput({ name = "slug", defaultValue = "", sourceName = "title", prefix = "/", withWriter = false }: { name?: string; defaultValue?: string; sourceName?: string; prefix?: string; withWriter?: boolean }) {
  const [v, setV] = useState(defaultValue);
  const [touched, setTouched] = useState(!!defaultValue);
  // novels: "{title}-novel-by-{writer}", built live as soon as a writer is picked
  useNovelSource(withWriter && !touched, ({ t, w }) => {
    const a = slugPart(t);
    setV(!a ? "" : /-novel-by-[a-z0-9-]+$/.test(a) || !slugPart(w) ? a : `${a}-novel-by-${slugPart(w)}`);
  });
  useEffect(() => {
    if (touched || withWriter) return;
    const src = document.querySelector<HTMLInputElement>(`input[name="${sourceName}"]`);
    if (!src) return;
    const on = () => setV(src.value.toLowerCase().trim().replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, ""));
    src.addEventListener("input", on);
    return () => src.removeEventListener("input", on);
  }, [touched, sourceName, withWriter]);
  return (
    <div className="a-field">
      <label>URL Slug</label>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span className="a-muted" style={{ fontSize: ".85rem" }}>
          {prefix}
        </span>
        <input
          type="text"
          name={name}
          value={v}
          onChange={(e) => {
            setTouched(true);
            setV(e.target.value);
          }}
          placeholder="auto-generated"
        />
      </div>
      <small>{withWriter && !defaultValue ? "Auto: novel name + writer name. You can edit it; once saved it stays the same." : "Leave empty to auto-generate. Changing it changes the page URL."}</small>
    </div>
  );
}
