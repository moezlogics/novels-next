"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CommentView } from "@/lib/data";
import { avatarColor, formatDate, initial, mediaUrl } from "@/lib/utils";
import { getGuestName, setGuestName } from "@/lib/readerStore";
import { useMe } from "../useMe";

type Msg = { type: "ok" | "warn" | "err"; text: string };
type ReplyTarget = { targetId: number; threadId: number; name: string };

const MAX_LEN = 2000;
const THREADS_PAGE = 15;
const REPLIES_PREVIEW = 3;
// quick check in the browser so obvious links fail instantly (the server checks everything again)
const LINK_HINT = /(h\s*t\s*t\s*p\s*s?\s*:\s*\/\s*\/|\bwww\s*\.|\b[a-z0-9-]{2,}\s*\.\s*(com|net|org|pk|io|xyz|info|biz|link|online)\b|\b(wa|t)\.me\b|bit\.ly|tinyurl)/i;
const mineKey = (postId: number) => `kn_my_comments_${postId}`;

function loadMine(postId: number): CommentView[] {
  try {
    const l = JSON.parse(sessionStorage.getItem(mineKey(postId)) || "[]");
    return Array.isArray(l) ? l : [];
  } catch {
    return [];
  }
}
function saveMine(postId: number, list: CommentView[]) {
  try {
    sessionStorage.setItem(mineKey(postId), JSON.stringify(list.slice(-20)));
  } catch {}
}

function Avatar({ c }: { c: CommentView }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className="sp-comment-avatar-wrap">
      {c.avatar && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={mediaUrl(c.avatar)} className="sp-comment-avatar" alt={c.name} loading="lazy" onError={() => setBroken(true)} />
      ) : (
        <div className="guest-letter-avatar" style={{ backgroundColor: avatarColor(c.name) }}>
          {initial(c.name)}
        </div>
      )}
    </div>
  );
}

function Alert({ m }: { m: Msg }) {
  return (
    <div className={`sp-alert sp-alert-${m.type}`} role={m.type === "err" ? "alert" : "status"}>
      <i className={`fa-solid ${m.type === "ok" ? "fa-circle-check" : m.type === "warn" ? "fa-circle-exclamation" : "fa-triangle-exclamation"}`}></i> {m.text}
    </div>
  );
}

function Form({
  postId,
  target,
  loggedIn,
  meName,
  onPosted,
  onCancel,
}: {
  postId: number;
  target?: ReplyTarget;
  loggedIn: boolean;
  meName: string;
  onPosted: (c: CommentView | null, msg: Msg) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg | null>(null);
  const [wait, setWait] = useState(0);
  const started = useRef(0);
  const hp = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const small = !!target;

  useEffect(() => {
    started.current = Date.now();
    setName(getGuestName());
    if (small) box.current?.focus({ preventScroll: false });
  }, [small]);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (busy || wait > 0) return;
    const text = message.trim();
    const who = name.trim();
    if (!loggedIn && who.length < 2) return setMsg({ type: "err", text: "Please enter your name." });
    if (!text) return setMsg({ type: "err", text: "Please write a comment." });
    if (LINK_HINT.test(text) || LINK_HINT.test(who)) return setMsg({ type: "err", text: "Links and website names are not allowed in comments." });
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/comments/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post_id: postId,
          parent_id: target?.targetId || null,
          name: who,
          message: text,
          website: hp.current?.value || "",
          elapsed: Date.now() - started.current,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok) {
        if (!loggedIn && who) setGuestName(who);
        setMessage("");
        const m: Msg = { type: d.comment?.pending || !d.comment ? "warn" : "ok", text: d.message || "Comment posted!" };
        if (!small) setMsg(m);
        onPosted(d.comment || null, m);
      } else {
        if (r.status === 429 && d.retryAfter) setWait(Number(d.retryAfter) || 0);
        setMsg({ type: r.status === 429 || r.status === 409 ? "warn" : "err", text: d.error || "Could not post. Please try again." });
      }
    } catch {
      setMsg({ type: "err", text: "Network error. Please check your internet and try again." });
    }
    setBusy(false);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit();
    if (e.key === "Escape" && onCancel) onCancel();
  };

  const left = MAX_LEN - message.length;
  const label = small ? { fontSize: "0.7rem", fontWeight: 700, color: "#475569", textTransform: "uppercase" as const } : undefined;

  return (
    <form onSubmit={submit} className={small ? "sp-reply-form" : undefined} noValidate>
      {msg ? <Alert m={msg} /> : null}
      {/* bots fill every field; people never see this one */}
      <input ref={hp} type="text" name="website" tabIndex={-1} autoComplete="off" className="sp-hp" aria-hidden="true" defaultValue="" />
      {!loggedIn ? (
        <div className={small ? "sp-field" : "sp-form-grid"}>
          <div className="sp-field">
            <label style={label}>
              Your Name <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input type="text" required placeholder="e.g. Ali Khan" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoComplete="name" style={small ? { padding: "8px 12px", fontSize: "0.85rem", height: 38 } : undefined} />
          </div>
        </div>
      ) : meName ? (
        <div className="sp-as">
          Commenting as <b>{meName}</b>
        </div>
      ) : null}
      <div className="sp-field">
        <label style={label}>
          {target ? `Reply to ${target.name}` : "Comment"} <span style={{ color: "#ef4444" }}>*</span>
        </label>
        <textarea
          ref={box}
          rows={small ? 3 : 4}
          required
          placeholder={small ? `Write your reply to ${target!.name}...` : "Write your comment here..."}
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, MAX_LEN))}
          onKeyDown={onKey}
          maxLength={MAX_LEN}
          style={small ? { padding: "8px 12px", fontSize: "0.85rem", minHeight: 80 } : undefined}
        />
        {left < 300 ? <div className={`sp-char${left < 50 ? " low" : ""}`}>{left} characters left</div> : null}
      </div>
      <div className="sp-form-foot">
        <button type="submit" className="sp-submit" disabled={busy || wait > 0 || !message.trim()} style={small ? { marginTop: 0, padding: "8px 20px", fontSize: "0.82rem" } : undefined}>
          {small ? null : <i className="fa-solid fa-paper-plane"></i>} {busy ? "Posting…" : wait > 0 ? `Wait ${wait}s` : small ? "Post Reply" : "Post Comment"}
        </button>
        {small ? (
          <button type="button" className="sp-submit sp-cancel" onClick={onCancel} style={{ marginTop: 0, padding: "8px 20px", fontSize: "0.82rem" }}>
            Cancel
          </button>
        ) : null}
        <span className="sp-rules">No links, phone numbers or abusive words.</span>
      </div>
    </form>
  );
}

export default function Comments({ postId, comments }: { postId: number; comments: CommentView[] }) {
  const me = useMe();
  const loggedIn = !!(me?.member || me?.admin);
  const meName = me?.member?.name || me?.admin?.username || "";
  const [mine, setMine] = useState<CommentView[]>([]);
  const [replyFor, setReplyFor] = useState<ReplyTarget | null>(null);
  const [threadMsg, setThreadMsg] = useState<{ threadId: number; msg: Msg } | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [shown, setShown] = useState(THREADS_PAGE);
  const [fresh, setFresh] = useState<number | null>(null);

  // the reader's own comments from this visit (also the ones still waiting for review)
  useEffect(() => setMine(loadMine(postId)), [postId]);

  const all = useMemo(() => {
    const byId = new Map<number, CommentView>();
    comments.forEach((c) => byId.set(c.id, c));
    mine.forEach((c) => {
      const server = byId.get(c.id);
      // once the page has it, the server copy wins (approved + real avatar)
      if (!server) byId.set(c.id, c);
    });
    return [...byId.values()];
  }, [comments, mine]);

  const { parents, replies, count } = useMemo(() => {
    const ids = new Set(all.map((c) => c.id));
    const parents = all.filter((c) => !c.parent_id || !ids.has(c.parent_id)).sort((a, b) => b.id - a.id);
    const replies = new Map<number, CommentView[]>();
    all
      .filter((c) => c.parent_id && ids.has(c.parent_id))
      .sort((a, b) => a.id - b.id)
      .forEach((c) => replies.set(c.parent_id!, [...(replies.get(c.parent_id!) || []), c]));
    return { parents, replies, count: all.filter((c) => !c.pending).length };
  }, [all]);

  // keep the stored list small: drop comments the server page already shows
  useEffect(() => {
    if (!mine.length) return;
    const serverIds = new Set(comments.map((c) => c.id));
    const left = mine.filter((c) => !serverIds.has(c.id));
    if (left.length !== mine.length) {
      setMine(left);
      saveMine(postId, left);
    }
  }, [comments, mine, postId]);

  useEffect(() => {
    if (!fresh) return;
    const el = document.getElementById(`comment-${fresh}`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    const t = setTimeout(() => setFresh(null), 4000);
    return () => clearTimeout(t);
  }, [fresh]);

  const posted = useCallback(
    (threadId: number | null) => (c: CommentView | null, msg: Msg) => {
      if (c) {
        setMine((prev) => {
          const next = [...prev.filter((x) => x.id !== c.id), c];
          saveMine(postId, next);
          return next;
        });
        setFresh(c.id);
      }
      if (threadId) {
        setReplyFor(null);
        setExpanded((s) => new Set(s).add(threadId));
        setThreadMsg({ threadId, msg });
      } else setThreadMsg(null);
    },
    [postId],
  );

  const openReply = (c: CommentView, threadId: number) => {
    setThreadMsg(null);
    setReplyFor((cur) => (cur?.targetId === c.id ? null : { targetId: c.id, threadId, name: c.name }));
  };

  const node = (c: CommentView, threadId: number) => (
    <div className={`sp-comment-node${fresh === c.id ? " sp-comment-new" : ""}`} id={`comment-${c.id}`} key={c.id}>
      <Avatar c={c} />
      <div className="sp-comment-content">
        <div className="sp-comment-header">
          <div className="sp-comment-author-wrap">
            <span className="sp-comment-author-name">{c.name}</span>
            {c.is_admin ? (
              <span className="sp-comment-badge-admin">
                <i className="fa-solid fa-user-shield" style={{ fontSize: "0.55rem", marginRight: 2.5 }}></i>Admin
              </span>
            ) : null}
            {c.pending ? <span className="sp-comment-pending">Awaiting review</span> : null}
          </div>
          <span className="sp-comment-date" suppressHydrationWarning>
            {formatDate(c.created_at)}
          </span>
        </div>
        {c.reply_to ? (
          <div className="sp-reply-to">
            <i className="fa-solid fa-reply"></i> {c.reply_to}
          </div>
        ) : null}
        <div className="sp-comment-text" style={{ whiteSpace: "pre-line" }}>
          {c.message}
        </div>
        {!c.pending ? (
          <div className="sp-comment-actions">
            <button type="button" className="sp-comment-action-btn" onClick={() => openReply(c, threadId)} aria-expanded={replyFor?.targetId === c.id}>
              <i className="fa-solid fa-reply"></i> {replyFor?.targetId === c.id ? "Cancel" : "Reply"}
            </button>
          </div>
        ) : null}
        {replyFor?.targetId === c.id ? (
          <div className="sp-reply-form-wrap">
            <Form key={c.id} postId={postId} target={replyFor} loggedIn={loggedIn} meName={meName} onPosted={posted(threadId)} onCancel={() => setReplyFor(null)} />
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <div id="comments">
      <h2 className="sp-comments-title">
        <i className="fa-solid fa-comments"></i> Comments ({count})
      </h2>
      {parents.length ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {parents.slice(0, shown).map((c) => {
            const list = replies.get(c.id) || [];
            const open = expanded.has(c.id) || list.length <= REPLIES_PREVIEW + 1;
            const visible = open ? list : list.slice(0, REPLIES_PREVIEW);
            return (
              <div className="sp-comment-thread" id={`comment-thread-${c.id}`} key={c.id}>
                {node(c, c.id)}
                {list.length ? (
                  <div className="sp-comment-replies-list">
                    {visible.map((r) => node(r, c.id))}
                    {!open ? (
                      <button type="button" className="sp-comment-action-btn sp-more-replies" onClick={() => setExpanded((s) => new Set(s).add(c.id))}>
                        <i className="fa-solid fa-comments"></i> View {list.length - visible.length} more {list.length - visible.length === 1 ? "reply" : "replies"}
                      </button>
                    ) : null}
                  </div>
                ) : null}
                {threadMsg?.threadId === c.id ? (
                  <div className="sp-thread-msg">
                    <Alert m={threadMsg.msg} />
                  </div>
                ) : null}
              </div>
            );
          })}
          {parents.length > shown ? (
            <button type="button" className="sp-submit sp-load-more" onClick={() => setShown((n) => n + THREADS_PAGE)}>
              Load more comments ({parents.length - shown})
            </button>
          ) : null}
        </div>
      ) : (
        <p style={{ fontSize: "0.88rem", color: "#94a3b8", padding: "12px 0" }}>No comments yet. Be the first to comment!</p>
      )}

      <div className="sp-form-title">Leave a Comment</div>
      <Form postId={postId} loggedIn={loggedIn} meName={meName} onPosted={posted(null)} />
    </div>
  );
}
