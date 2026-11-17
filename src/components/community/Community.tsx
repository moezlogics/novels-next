"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { mediaUrl, timeAgo } from "@/lib/utils";
import { useMe, type Me } from "../useMe";
import { EditProfileModal } from "../account/AccountHome";

export interface FeedPost {
  id: number;
  member_id: number;
  category_id: number | null;
  category_name: string;
  content: string;
  images: string[];
  created_at: string;
  author_name: string;
  author_username: string;
  author_avatar: string;
  likes_count: number;
  comments_count: number;
  views: number;
  user_liked: boolean;
  story?: { id: number; n: number; title: string; ep: string };
}

const goLogin = () => (window.location.href = `/login/?return=${encodeURIComponent(location.pathname + location.search)}`);
const num = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "")}k` : String(n));

/** Round avatar: the photo, or the first letter of the name. */
export function Avatar({ src, name, size = 40 }: { src?: string | null; name: string; size?: number }) {
  const pic = src && !/default_avatar/i.test(src) ? mediaUrl(src) : "";
  const [broken, setBroken] = useState(false);
  return (
    <span className="cm-av" style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {pic && !broken ? <img src={pic} alt="" loading="lazy" onError={() => setBroken(true)} /> : (name || "?").trim().charAt(0).toUpperCase()}
    </span>
  );
}

// ── post views: a post counts when it stays on screen for a second ──
const seenPosts = new Set<number>();
let viewQueue: number[] = [];
let viewTimer = 0;
let seenLoaded = false;
function flushViews() {
  if (!viewQueue.length) return;
  const body = JSON.stringify({ ids: viewQueue });
  viewQueue = [];
  if (navigator.sendBeacon) navigator.sendBeacon("/api/community/views/", new Blob([body], { type: "application/json" }));
  else void fetch("/api/community/views/", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
}
function markSeen(id: number) {
  if (!seenLoaded) {
    seenLoaded = true;
    try {
      (JSON.parse(sessionStorage.getItem("kn_cv") || "[]") as number[]).forEach((x) => seenPosts.add(x));
    } catch {}
    window.addEventListener("pagehide", flushViews);
  }
  if (seenPosts.has(id)) return;
  seenPosts.add(id);
  try {
    sessionStorage.setItem("kn_cv", JSON.stringify([...seenPosts].slice(-500)));
  } catch {}
  viewQueue.push(id);
  clearTimeout(viewTimer);
  viewTimer = window.setTimeout(flushViews, 2500);
}

export function useToast() {
  const [t, setT] = useState("");
  const timer = useRef(0);
  const show = (m: string) => {
    setT(m);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setT(""), 2600);
  };
  const el = (
    <div className={`cm-toast${t ? " show" : ""}`} role="status">
      {t}
    </div>
  );
  return { show, el };
}

function Skeletons({ n = 4 }: { n?: number }) {
  return (
    <>
      {Array.from({ length: n }).map((_, i) => (
        <div className="cm-post cm-skel" key={i} aria-hidden="true">
          <span className="cm-av" style={{ width: 40, height: 40 }}></span>
          <div className="cm-post-main">
            <i style={{ width: "35%" }}></i>
            <i style={{ width: "90%" }}></i>
            <i style={{ width: "60%" }}></i>
          </div>
        </div>
      ))}
    </>
  );
}

interface CommentRow {
  id: number;
  comment: string;
  created_at: string;
  author_name: string;
  author_avatar: string;
}

/**
 * One post. `full` shows the whole text (single-post page); in the feed long text is
 * cut to a few lines with "Read more". `bare` shows only the actions and comments
 * (used under a story episode).
 */
export function PostCard({ post, me, onDeleted, toast, defaultOpen = false, full = false, bare = false }: { post: FeedPost; me: Me["member"]; onDeleted?: (id: number) => void; toast: (m: string) => void; defaultOpen?: boolean; full?: boolean; bare?: boolean }) {
  const [p, setP] = useState(post);
  const [menu, setMenu] = useState(false);
  const [open, setOpen] = useState(defaultOpen);
  const [expanded, setExpanded] = useState(full);
  const [comments, setComments] = useState<CommentRow[] | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [lightbox, setLightbox] = useState("");
  const profile = `/community/u/${encodeURIComponent(p.author_username)}/`;
  const mine = !!me && me.id === p.member_id;
  const box = useRef<HTMLElement>(null);
  const long = p.content.length > 320 || p.content.split("\n").length > 7;

  // count a view once the post has been on screen for a second (not the author's own)
  useEffect(() => {
    if (mine || bare || !box.current) return;
    let t = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        clearTimeout(t);
        if (e.isIntersecting) t = window.setTimeout(() => (markSeen(p.id), io.disconnect()), 1000);
      },
      { threshold: 0.5 },
    );
    io.observe(box.current);
    return () => (clearTimeout(t), io.disconnect());
  }, [mine, bare, p.id]);

  const loadComments = useCallback(async () => {
    const d = await fetch(`/api/community/${p.id}/`)
      .then((r) => r.json())
      .catch(() => ({ comments: [] }));
    setComments(d.comments || []);
  }, [p.id]);
  useEffect(() => {
    if (open && !comments) void loadComments();
  }, [open, comments, loadComments]);
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menu]);
  useEffect(() => {
    if (!lightbox) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setLightbox("");
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [lightbox]);

  const act = (body: object) => fetch(`/api/community/${p.id}/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json());
  const like = async () => {
    if (!me) return goLogin();
    // show the change at once, correct it if the server says otherwise
    const before = p;
    setP({ ...p, user_liked: !p.user_liked, likes_count: p.likes_count + (p.user_liked ? -1 : 1) });
    const d = await act({ action: "like" }).catch(() => null);
    if (d?.status === "success") setP((x) => ({ ...x, user_liked: d.user_liked, likes_count: d.likes_count }));
    else {
      setP(before);
      toast(d?.error || "Could not like. Try again.");
    }
  };
  const send = async () => {
    if (!me) return goLogin();
    if (!text.trim() || sending) return;
    setSending(true);
    const d = await act({ action: "comment", comment: text }).catch(() => null);
    setSending(false);
    if (d?.status === "success") {
      setText("");
      setP((x) => ({ ...x, comments_count: d.comments_count }));
      void loadComments();
    } else toast(d?.error || "Comment was not sent.");
  };
  const share = async () => {
    const url = p.story ? `${location.origin}/community/story/${p.story.id}/${p.story.n}/` : `${location.origin}/community/post/${p.id}/`;
    try {
      if (navigator.share) await navigator.share({ title: p.story ? p.story.title : `${p.author_name} on community`, url });
      else {
        await navigator.clipboard.writeText(url);
        toast("Link copied");
      }
    } catch {}
  };
  const del = async () => {
    if (!confirm("Delete this post? This cannot be undone.")) return;
    const d = await fetch("/api/community/", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ post_id: p.id }) }).then((r) => r.json());
    if (d.status === "success") {
      toast("Post deleted");
      onDeleted?.(p.id);
    } else toast(d.error || "Could not delete");
  };

  const actions = (
    <div className="cm-actions">
      <button type="button" className={`cm-act${p.user_liked ? " on" : ""}`} onClick={like} aria-pressed={p.user_liked} aria-label="Like">
        <i className={p.user_liked ? "fa-solid fa-heart" : "fa-regular fa-heart"}></i>
        {p.likes_count ? <span>{num(p.likes_count)}</span> : null}
      </button>
      <button type="button" className="cm-act" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Comments">
        <i className="fa-regular fa-comment"></i>
        {p.comments_count ? <span>{num(p.comments_count)}</span> : null}
      </button>
      <button type="button" className="cm-act" onClick={share} aria-label="Share">
        <i className="fa-solid fa-share"></i>
      </button>
      {mine && !bare ? (
        <span className="cm-act cm-views" title="Views — only you can see this">
          <i className="fa-regular fa-eye"></i>
          <span>{num(p.views)}</span>
        </span>
      ) : null}
    </div>
  );

  const thread = open ? (
    <div className="cm-comments">
      {comments === null ? (
        <p className="cm-note">Loading…</p>
      ) : !comments.length ? (
        <p className="cm-note">No comments yet. Be the first.</p>
      ) : (
        comments.map((c) => (
          <div className="cm-comment" key={c.id}>
            <Avatar src={c.author_avatar} name={c.author_name} size={28} />
            <div>
              <b>{c.author_name}</b> <time suppressHydrationWarning>{timeAgo(c.created_at)}</time>
              <p dir="auto">{c.comment}</p>
            </div>
          </div>
        ))
      )}
      {me ? (
        <form
          className="cm-comment-form"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <input type="text" placeholder="Write a comment…" value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} dir="auto" aria-label="Write a comment" />
          <button type="submit" disabled={!text.trim() || sending}>
            {sending ? "…" : "Send"}
          </button>
        </form>
      ) : (
        <p className="cm-note">
          <button type="button" className="cm-link" onClick={goLogin}>
            Sign in
          </button>{" "}
          to comment
        </p>
      )}
    </div>
  ) : null;

  if (bare)
    return (
      <section className="cm-bare" aria-label="Likes and comments">
        {actions}
        {thread}
      </section>
    );

  return (
    <article ref={box} className="cm-post">
      <Link href={profile} rel="nofollow" tabIndex={-1} aria-hidden="true">
        <Avatar src={p.author_avatar} name={p.author_name} />
      </Link>
      <div className="cm-post-main">
        <header className="cm-post-head">
          <Link href={profile} className="cm-name" rel="nofollow">
            {p.author_name}
          </Link>
          <time suppressHydrationWarning>{timeAgo(p.created_at)}</time>
          {mine && !p.story ? (
            <div className="cm-menu">
              <button
                type="button"
                aria-label="Post options"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenu((m) => !m);
                }}
              >
                <i className="fa-solid fa-ellipsis"></i>
              </button>
              {menu ? (
                <div className="cm-menu-list">
                  <button type="button" onClick={del}>
                    <i className="fa-solid fa-trash"></i> Delete
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </header>

        {p.story ? (
          <Link href={`/community/story/${p.story.id}/${p.story.n}/`} className="cm-epcard" rel="nofollow">
            <span className="cm-epcard-ico">
              <i className="fa-solid fa-book-open"></i>
            </span>
            <span className="cm-epcard-txt">
              <small>New episode · {p.story.title}</small>
              <b dir="auto">
                Episode {p.story.n}
                {p.story.ep ? `: ${p.story.ep}` : ""}
              </b>
            </span>
            <span className="cm-epcard-go">Read</span>
          </Link>
        ) : p.content ? (
          <>
            <div className={`cm-text${long && !expanded ? " clamp" : ""}`} dir="auto">
              {p.content}
            </div>
            {long && !expanded ? (
              <button type="button" className="cm-link cm-more" onClick={() => setExpanded(true)}>
                Read more
              </button>
            ) : null}
          </>
        ) : null}

        {p.images.length ? (
          <div className={`cm-imgs n${Math.min(p.images.length, 4)}`}>
            {p.images.slice(0, 4).map((img) => (
              <button type="button" key={img} onClick={() => setLightbox(mediaUrl(img))} aria-label="Open photo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mediaUrl(img)} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        ) : null}

        {actions}
        {thread}
      </div>
      {lightbox ? (
        <div className="cm-lightbox" onClick={() => setLightbox("")} role="dialog" aria-label="Photo">
          <button type="button" aria-label="Close">
            <i className="fa-solid fa-xmark"></i>
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" />
        </div>
      ) : null}
    </article>
  );
}

function Composer({ open, onClose, cats, onPosted, toast }: { open: boolean; onClose: () => void; cats: { id: number; name: string }[]; onPosted: () => void; toast: (m: string) => void }) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [len, setLen] = useState(0);
  const ta = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => ta.current?.focus(), 150);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => (clearTimeout(t), document.removeEventListener("keydown", esc));
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="cm-sheet-wrap" onClick={onClose}>
      <form
        className="cm-sheet"
        role="dialog"
        aria-label="New post"
        onClick={(e) => e.stopPropagation()}
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          setBusy(true);
          const d = await fetch("/api/community/", { method: "POST", body: new FormData(form) })
            .then((r) => r.json())
            .catch(() => ({ error: "No internet. Please try again." }));
          setBusy(false);
          if (d.status === "success") {
            form.reset();
            setPreviews([]);
            setLen(0);
            onClose();
            toast("Posted");
            onPosted();
          } else toast(d.error || "This post was not allowed.");
        }}
      >
        <div className="cm-sheet-head">
          <button type="button" className="cm-link" onClick={onClose}>
            Cancel
          </button>
          <b>New post</b>
          <button type="submit" className="cm-btn" disabled={busy || !len}>
            {busy ? "Posting…" : "Post"}
          </button>
        </div>
        <textarea ref={ta} name="content" placeholder="Share a quote, a thought, a favourite line…" required maxLength={5000} dir="auto" onChange={(e) => setLen(e.target.value.trim().length)}></textarea>
        {previews.length ? (
          <div className="cm-previews">
            {previews.map((src) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} src={src} alt="" />
            ))}
          </div>
        ) : null}
        <div className="cm-sheet-foot">
          <label className="cm-tool" title="Add photos (up to 4)">
            <i className="fa-solid fa-image"></i>
            <input type="file" name="images" multiple accept="image/*" hidden onChange={(e) => setPreviews(Array.from(e.target.files || []).slice(0, 4).map((f) => URL.createObjectURL(f)))} />
          </label>
          <select name="category_id" defaultValue="" aria-label="Topic">
            <option value="">Topic (optional)</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <span className="cm-count">{len ? `${len}/5000` : ""}</span>
        </div>
      </form>
    </div>
  );
}

export default function CommunityFeed({ cats }: { cats: { id: number; name: string; slug: string }[] }) {
  const me = useMe();
  const member = me?.member || null;
  const { show, el } = useToast();
  const [sort, setSort] = useState<"for_you" | "latest">("for_you");
  const [cat, setCat] = useState(0);
  const [posts, setPosts] = useState<FeedPost[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(true);
  const [busy, setBusy] = useState(false);
  const [compose, setCompose] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const seed = useRef(0);
  const closeCompose = useCallback(() => setCompose(false), []);

  const load = useCallback(
    async (reset: boolean) => {
      if (busy) return;
      setBusy(true);
      setFailed(false);
      const pg = reset ? 1 : page;
      if (!seed.current) seed.current = Math.floor(Math.random() * 1e6);
      const d = await fetch(`/api/community/?page=${pg}&limit=10&sort=${sort}&category_id=${cat}&seed=${seed.current}`)
        .then((r) => r.json())
        .catch(() => null);
      if (d?.status === "success") {
        setPosts((old) => (reset ? d.posts : [...(old || []), ...d.posts]));
        setMore(d.has_more);
        setPage(pg + 1);
      } else {
        setFailed(true);
        if (reset) setPosts([]);
      }
      setBusy(false);
    },
    [busy, page, sort, cat],
  );

  // "New post" from the profile page opens the composer straight away
  useEffect(() => {
    if (member && new URLSearchParams(location.search).get("compose") === "1") setCompose(true);
  }, [member]);

  useEffect(() => {
    setPosts(null);
    void load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, cat]);

  useEffect(() => {
    if (!sentinel.current || !more || failed) return;
    const io = new IntersectionObserver((e) => e[0].isIntersecting && posts && !busy && load(false), { rootMargin: "500px" });
    io.observe(sentinel.current);
    return () => io.disconnect();
  }, [more, failed, posts, busy, load]);

  return (
    <div className="cm">
      <header className="cm-top">
        <h1>Community</h1>
        {member ? (
          <Link href={`/community/u/${encodeURIComponent(member.username)}/`} rel="nofollow" aria-label="My profile">
            <Avatar src={member.profile_pic} name={member.name} size={32} />
          </Link>
        ) : me ? (
          <Link href="/login/?return=/community/" className="cm-btn">
            Sign in
          </Link>
        ) : null}
      </header>
      <nav className="cm-tabs" aria-label="Community sections">
        <button type="button" className={sort === "for_you" ? "on" : ""} onClick={() => setSort("for_you")}>
          For you
        </button>
        <button type="button" className={sort === "latest" ? "on" : ""} onClick={() => setSort("latest")}>
          Latest
        </button>
        <Link href="/community/stories/" rel="nofollow">
          Stories
        </Link>
      </nav>
      {cats.length ? (
        <div className="cm-chips" role="group" aria-label="Topics">
          <button type="button" className={cat === 0 ? "on" : ""} onClick={() => setCat(0)}>
            All
          </button>
          {cats.map((c) => (
            <button key={c.id} type="button" className={cat === c.id ? "on" : ""} onClick={() => setCat(c.id)}>
              {c.name}
            </button>
          ))}
        </div>
      ) : null}

      {member ? (
        <button type="button" className="cm-compose" onClick={() => setCompose(true)}>
          <Avatar src={member.profile_pic} name={member.name} size={36} />
          <span>Share something…</span>
          <b>Post</b>
        </button>
      ) : me ? (
        <div className="cm-guest">
          <span>Sign in to post, like and comment.</span>
          <Link href="/register/?return=/community/" className="cm-link">
            Create account
          </Link>
        </div>
      ) : null}

      <div className="cm-feed" aria-busy={posts === null}>
        {posts === null ? (
          <Skeletons />
        ) : !posts.length ? (
          <div className="cm-empty">
            <p>{failed ? "Could not load posts. Check your internet." : "Nothing here yet. Be the first to post."}</p>
            {failed ? (
              <button type="button" className="cm-btn ghost" onClick={() => load(true)}>
                Try again
              </button>
            ) : null}
          </div>
        ) : (
          posts.map((p) => <PostCard key={p.id} post={p} me={member} toast={show} onDeleted={(id) => setPosts((l) => (l || []).filter((x) => x.id !== id))} />)
        )}
        {posts?.length && failed ? (
          <div className="cm-empty">
            <button type="button" className="cm-btn ghost" onClick={() => load(false)}>
              Load more
            </button>
          </div>
        ) : null}
        {posts?.length && !more ? <p className="cm-end">You&apos;re all caught up</p> : null}
      </div>
      <div ref={sentinel}></div>
      {member ? <Composer open={compose} onClose={closeCompose} cats={cats} onPosted={() => load(true)} toast={show} /> : null}
      {el}
    </div>
  );
}

export function SinglePost({ post, bare = false }: { post: FeedPost; bare?: boolean }) {
  const me = useMe();
  const { show, el } = useToast();
  return (
    <>
      <PostCard post={post} me={me?.member || null} toast={show} defaultOpen full bare={bare} onDeleted={() => (location.href = "/community/")} />
      {el}
    </>
  );
}

/** Profile buttons: the owner gets Edit + Sign out, everyone else gets Share. */
export function ProfileActions({ username, name }: { username: string; name: string }) {
  const me = useMe();
  const { show, el } = useToast();
  const [edit, setEdit] = useState(false);
  const owner = me?.member?.username === username;
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: name, url: location.href });
      else {
        await navigator.clipboard.writeText(location.href);
        show("Profile link copied");
      }
    } catch {}
  };
  return (
    <div className="cm-pf-actions">
      {owner ? (
        <button type="button" className="cm-btn ghost" onClick={() => setEdit(true)}>
          Edit profile
        </button>
      ) : null}
      <button type="button" className="cm-btn ghost" onClick={share}>
        Share
      </button>
      {owner ? (
        <button
          type="button"
          className="cm-btn ghost"
          onClick={async () => {
            await fetch("/api/auth/logout/", { method: "POST" });
            location.href = "/community/";
          }}
        >
          Sign out
        </button>
      ) : null}
      {edit && me?.member ? <EditProfileModal member={me.member} onClose={() => setEdit(false)} /> : null}
      {el}
    </div>
  );
}

/** A member's posts on their profile — same cards as the feed. */
export function ProfilePosts({ posts, owner }: { posts: FeedPost[]; owner: boolean }) {
  const me = useMe();
  const { show, el } = useToast();
  const [list, setList] = useState(posts);
  if (!list.length)
    return (
      <div className="cm-empty">
        <p>{owner ? "You haven't posted yet." : "No posts yet."}</p>
        {owner ? (
          <Link href="/community/?compose=1" className="cm-btn" rel="nofollow">
            Write your first post
          </Link>
        ) : null}
      </div>
    );
  return (
    <div className="cm-feed">
      {list.map((p) => (
        <PostCard key={p.id} post={p} me={me?.member || null} toast={show} onDeleted={(id) => setList((l) => l.filter((x) => x.id !== id))} />
      ))}
      {el}
    </div>
  );
}
