"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { mediaUrl } from "@/lib/utils";
import { useToast } from "./Community";

const api = (fd: FormData) =>
  fetch("/api/community/stories/", { method: "POST", body: fd })
    .then((r) => r.json())
    .catch(() => ({ error: "No internet. Please try again." }));

/** Create or edit a story (name, short intro, cover, topic, status). */
export function StoryForm({ story, cats }: { story?: { id: number; title: string; description: string; cover: string; category_id: number | null; status: string }; cats: { id: number; name: string }[] }) {
  const { show, el } = useToast();
  const [busy, setBusy] = useState(false);
  const [cover, setCover] = useState(story?.cover ? mediaUrl(story.cover) : "");
  return (
    <form
      className="cm-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const d = await api(new FormData(e.currentTarget));
        if (d.status === "success") location.href = story ? `/community/story/${d.id}/` : `/community/story/${d.id}/write/`;
        else {
          setBusy(false);
          show(d.error || "Could not save.");
        }
      }}
    >
      <input type="hidden" name="action" value="save_story" />
      {story ? <input type="hidden" name="id" value={story.id} /> : null}
      <label>
        Story name
        <input type="text" name="title" defaultValue={story?.title} required minLength={2} maxLength={120} dir="auto" placeholder="e.g. Dil Ki Baat" autoFocus={!story} />
      </label>
      <label>
        Short intro <small>(optional)</small>
        <textarea name="description" defaultValue={story?.description} maxLength={1500} rows={4} dir="auto" placeholder="What is this story about?"></textarea>
      </label>
      <div className="cm-form-row">
        <label className="cm-cover-pick">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {cover ? <img src={cover} alt="" /> : <i className="fa-solid fa-image"></i>}
          <span>{cover ? "Change cover" : "Add cover (optional)"}</span>
          <input type="file" name="cover" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && setCover(URL.createObjectURL(e.target.files[0]))} />
        </label>
        <div className="cm-form-col">
          <label>
            Topic
            <select name="category_id" defaultValue={story?.category_id ?? ""}>
              <option value="">None</option>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select name="status" defaultValue={story?.status || "ongoing"}>
              <option value="ongoing">Ongoing (more episodes coming)</option>
              <option value="complete">Complete</option>
            </select>
          </label>
        </div>
      </div>
      <button type="submit" className="cm-btn big" disabled={busy}>
        {busy ? "Saving…" : story ? "Save changes" : "Next: write episode 1"}
      </button>
      {el}
    </form>
  );
}

/** Write or edit one episode. The text is kept as a draft on this device until it is published. */
export function EpisodeForm({ storyId, n, nextN, title = "", content = "" }: { storyId: number; n?: number; nextN: number; title?: string; content?: string }) {
  const { show, el } = useToast();
  const key = `kn_ep_draft_${storyId}_${n || "new"}`;
  const [t, setT] = useState(title);
  const [c, setC] = useState(content);
  const [busy, setBusy] = useState(false);
  const [restored, setRestored] = useState(false);
  const ta = useRef<HTMLTextAreaElement>(null);

  // bring back an unfinished draft
  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem(key) || "null");
      if (d && typeof d.c === "string" && d.c.trim() && d.c !== content) {
        setT(d.t || "");
        setC(d.c);
        setRestored(true);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // save while typing
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        if (c.trim() && c !== content) localStorage.setItem(key, JSON.stringify({ t, c }));
      } catch {}
    }, 800);
    return () => clearTimeout(id);
  }, [t, c, key, content]);
  // the box grows with the text
  useEffect(() => {
    const el2 = ta.current;
    if (!el2) return;
    el2.style.height = "auto";
    el2.style.height = `${Math.max(320, el2.scrollHeight + 2)}px`;
  }, [c]);

  const words = c.trim() ? c.trim().split(/\s+/).length : 0;
  return (
    <form
      className="cm-form cm-write"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const fd = new FormData();
        fd.set("action", "save_episode");
        fd.set("story_id", String(storyId));
        if (n) fd.set("n", String(n));
        fd.set("title", t);
        fd.set("content", c);
        const d = await api(fd);
        if (d.status === "success") {
          try {
            localStorage.removeItem(key);
          } catch {}
          location.href = `/community/story/${storyId}/${d.n}/`;
        } else {
          setBusy(false);
          show(d.error || "Could not publish.");
        }
      }}
    >
      <div className="cm-write-head">
        <b>Episode {n || nextN}</b>
        <span>
          {words.toLocaleString()} words{restored ? " · draft restored" : c.trim() && c !== content ? " · draft saved" : ""}
        </span>
      </div>
      <input type="text" value={t} onChange={(e) => setT(e.target.value)} maxLength={120} dir="auto" placeholder="Episode title (optional)" aria-label="Episode title" />
      <textarea ref={ta} value={c} onChange={(e) => setC(e.target.value)} maxLength={100000} dir="auto" required placeholder="Write your episode here…" aria-label="Episode text"></textarea>
      <div className="cm-write-foot">
        <Link href={`/community/story/${storyId}/`} className="cm-link" rel="nofollow">
          Cancel
        </Link>
        <button type="submit" className="cm-btn big" disabled={busy || c.trim().length < 200}>
          {busy ? "Publishing…" : n ? "Save changes" : "Publish episode"}
        </button>
      </div>
      {c.trim().length > 0 && c.trim().length < 200 ? <p className="cm-note">Write at least 200 characters to publish ({c.trim().length}/200).</p> : null}
      {el}
    </form>
  );
}

/** The episode text with a text-size control (remembered on this device). */
export function EpisodeBody({ content }: { content: string }) {
  const [size, setSize] = useState(18);
  useEffect(() => {
    const v = parseInt(localStorage.getItem("kn_ep_font") || "", 10);
    if (v >= 15 && v <= 28) setSize(v);
  }, []);
  const set = (v: number) => {
    const x = Math.min(28, Math.max(15, v));
    setSize(x);
    try {
      localStorage.setItem("kn_ep_font", String(x));
    } catch {}
  };
  return (
    <>
      <div className="cm-fontctl" role="group" aria-label="Text size">
        <button type="button" onClick={() => set(size - 1)} aria-label="Smaller text" disabled={size <= 15}>
          A−
        </button>
        <button type="button" onClick={() => set(size + 1)} aria-label="Larger text" disabled={size >= 28}>
          A+
        </button>
      </div>
      <div className="cm-read" style={{ fontSize: size }}>
        {content.split(/\n{2,}/).map((para, i) => (
          <p key={i} dir="auto">
            {para}
          </p>
        ))}
      </div>
    </>
  );
}

/** Owner tools on a story or an episode. */
export function OwnerTools({ storyId, n, canDeleteEpisode = false }: { storyId: number; n?: number; canDeleteEpisode?: boolean }) {
  const { show, el } = useToast();
  const run = async (action: string, msg: string, to: string) => {
    if (!confirm(msg)) return;
    const fd = new FormData();
    fd.set("action", action);
    fd.set("story_id", String(storyId));
    if (n) fd.set("n", String(n));
    const d = await api(fd);
    if (d.status === "success") location.href = to;
    else show(d.error || "Could not delete.");
  };
  return (
    <div className="cm-owner">
      {n ? (
        <>
          <Link href={`/community/story/${storyId}/write/?ep=${n}`} className="cm-btn ghost" rel="nofollow">
            <i className="fa-solid fa-pen"></i> Edit episode
          </Link>
          {canDeleteEpisode ? (
            <button type="button" className="cm-btn ghost danger" onClick={() => run("delete_episode", "Delete this episode? Its likes and comments are removed too.", `/community/story/${storyId}/`)}>
              Delete
            </button>
          ) : null}
        </>
      ) : (
        <>
          <Link href={`/community/story/${storyId}/write/`} className="cm-btn" rel="nofollow">
            <i className="fa-solid fa-plus"></i> Add episode
          </Link>
          <Link href={`/community/write/?id=${storyId}`} className="cm-btn ghost" rel="nofollow">
            Edit story
          </Link>
          <button type="button" className="cm-btn ghost danger" onClick={() => run("delete_story", "Delete this whole story and all its episodes? This cannot be undone.", "/community/stories/")}>
            Delete
          </button>
        </>
      )}
      {el}
    </div>
  );
}
