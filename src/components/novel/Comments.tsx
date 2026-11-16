"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { CommentView } from "@/lib/data";
import { avatarColor, formatDate, initial, mediaUrl } from "@/lib/utils";
import { getGuestName, setGuestName } from "@/lib/readerStore";
import { useMe } from "../useMe";

function Avatar({ c }: { c: CommentView }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className="sp-comment-avatar-wrap">
      {c.avatar && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={mediaUrl(c.avatar)} className="sp-comment-avatar" alt={c.name} onError={() => setBroken(true)} />
      ) : (
        <div className="guest-letter-avatar" style={{ backgroundColor: avatarColor(c.name) }}>
          {initial(c.name)}
        </div>
      )}
    </div>
  );
}

function Form({ postId, parentId, replyTo, loggedIn, onDone, onCancel }: { postId: number; parentId?: number; replyTo?: string; loggedIn: boolean; onDone: (msg: { type: string; text: string }) => void; onCancel?: () => void }) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => setName(getGuestName()), []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await fetch("/api/comments/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: postId, parent_id: parentId || null, name, message }),
      });
      const d = await r.json();
      if (r.ok) {
        if (!loggedIn && name) setGuestName(name);
        setMessage("");
        onDone({ type: "ok", text: d.message || "Comment posted successfully!" });
      } else onDone({ type: r.status === 429 ? "warn" : "err", text: d.error || "Failed to post comment. Try again." });
    } catch {
      onDone({ type: "err", text: "Network error. Try again." });
    }
    setBusy(false);
  };

  const small = !!parentId;
  return (
    <form onSubmit={submit} style={small ? { display: "flex", flexDirection: "column", gap: 12, margin: 0 } : undefined}>
      {!loggedIn ? (
        <div className={small ? "sp-field" : "sp-form-grid"}>
          <div className="sp-field">
            <label style={small ? { fontSize: "0.7rem", fontWeight: 700, color: "#475569", textTransform: "uppercase" } : undefined}>
              Your Name <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input type="text" required placeholder="e.g. Ali Khan" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} style={small ? { padding: "8px 12px", fontSize: "0.85rem", height: 38 } : undefined} />
          </div>
        </div>
      ) : null}
      <div className="sp-field">
        <label style={small ? { fontSize: "0.7rem", fontWeight: 700, color: "#475569", textTransform: "uppercase" } : undefined}>
          {replyTo ? `Reply to ${replyTo}` : "Comment"} <span style={{ color: "#ef4444" }}>*</span>
        </label>
        <textarea rows={small ? 3 : 4} required placeholder={small ? "Write your reply here..." : "Write your comment here..."} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={3000} style={small ? { padding: "8px 12px", fontSize: "0.85rem", minHeight: 80 } : undefined} />
      </div>
      {small ? (
        <div style={{ display: "flex", gap: 10 }}>
          <button type="submit" className="sp-submit" disabled={busy} style={{ marginTop: 0, padding: "8px 20px", fontSize: "0.82rem" }}>
            {busy ? "Posting…" : "Post Reply"}
          </button>
          <button type="button" className="sp-submit" onClick={onCancel} style={{ marginTop: 0, padding: "8px 20px", fontSize: "0.82rem", background: "#cbd5e1", color: "#475569" }}>
            Cancel
          </button>
        </div>
      ) : (
        <button type="submit" className="sp-submit" disabled={busy}>
          <i className="fa-solid fa-paper-plane"></i> {busy ? "Posting…" : "Post Comment"}
        </button>
      )}
    </form>
  );
}

export default function Comments({ postId, comments }: { postId: number; comments: CommentView[] }) {
  const router = useRouter();
  const me = useMe();
  const loggedIn = !!(me?.member || me?.admin);
  const [replyFor, setReplyFor] = useState<{ id: number; name: string } | null>(null);
  const [alert, setAlert] = useState<{ type: string; text: string } | null>(null);

  const { parents, replies } = useMemo(() => {
    const parents = comments.filter((c) => !c.parent_id).sort((a, b) => b.id - a.id);
    const replies = new Map<number, CommentView[]>();
    comments.filter((c) => c.parent_id).forEach((c) => replies.set(c.parent_id!, [...(replies.get(c.parent_id!) || []), c]));
    return { parents, replies };
  }, [comments]);

  const done = (m: { type: string; text: string }) => {
    setAlert(m);
    if (m.type === "ok") {
      setReplyFor(null);
      router.refresh();
    }
  };

  const node = (c: CommentView, threadId: number) => (
    <div className="sp-comment-node" id={`comment-${c.id}`} key={c.id}>
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
          </div>
          <span className="sp-comment-date" suppressHydrationWarning>
            {formatDate(c.created_at)}
          </span>
        </div>
        <div className="sp-comment-text" style={{ whiteSpace: "pre-line" }}>
          {c.message}
        </div>
        <div className="sp-comment-actions">
          <button type="button" className="sp-comment-action-btn" onClick={() => setReplyFor(replyFor?.id === threadId && replyFor.name === c.name ? null : { id: threadId, name: c.name })}>
            <i className="fa-solid fa-reply"></i> Reply
          </button>
        </div>
        {replyFor && replyFor.id === threadId && c.id === threadId ? (
          <div style={{ width: "100%" }}>
            <div className="sp-reply-form-wrap">
              <Form postId={postId} parentId={threadId} replyTo={replyFor.name} loggedIn={loggedIn} onDone={done} onCancel={() => setReplyFor(null)} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <div id="comments">
      <h2 className="sp-comments-title">
        <i className="fa-solid fa-comments"></i> Comments ({comments.length})
      </h2>
      {parents.length ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {parents.map((c) => (
            <div className="sp-comment-thread" id={`comment-thread-${c.id}`} key={c.id}>
              {node(c, c.id)}
              {replies.get(c.id)?.length ? <div className="sp-comment-replies-list">{replies.get(c.id)!.map((r) => node(r, c.id))}</div> : null}
            </div>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: "0.88rem", color: "#94a3b8", padding: "12px 0" }}>No comments yet. Be the first to comment!</p>
      )}

      <div className="sp-form-title">Leave a Comment</div>
      {alert ? (
        <div className={`sp-alert sp-alert-${alert.type}`}>
          <i className={`fa-solid ${alert.type === "ok" ? "fa-circle-check" : alert.type === "warn" ? "fa-circle-exclamation" : "fa-triangle-exclamation"}`}></i> {alert.text}
        </div>
      ) : null}
      <Form postId={postId} loggedIn={loggedIn} onDone={done} />
    </div>
  );
}
