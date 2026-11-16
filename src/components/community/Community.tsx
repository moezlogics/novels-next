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
  user_liked: boolean;
}

const DEFAULT_AVATAR = "/uploads/community/default_avatar.png";
const av = (p: string) => (p ? mediaUrl(p) : DEFAULT_AVATAR);
const goLogin = () => (window.location.href = `/login/?return=${encodeURIComponent(location.pathname + location.search)}`);

function useToast() {
  const [t, setT] = useState("");
  const timer = useRef(0);
  const show = (m: string) => {
    setT(m);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setT(""), 2600);
  };
  const el = <div className={`comm-toast${t ? " show" : ""}`}>{t}</div>;
  return { show, el };
}

function Skeletons({ n = 3 }: { n?: number }) {
  return (
    <>
      {Array.from({ length: n }).map((_, i) => (
        <div className="comm-skeleton" key={i}>
          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            <div className="comm-skel-avatar"></div>
            <div style={{ flex: 1 }}>
              <div className="comm-skel-line w40"></div>
              <div className="comm-skel-line w60"></div>
            </div>
          </div>
          <div className="comm-skel-line w80"></div>
          <div className="comm-skel-line w60"></div>
        </div>
      ))}
    </>
  );
}

export function PostCard({ post, me, onDeleted, toast, defaultOpen = false, style }: { post: FeedPost; me: Me["member"]; onDeleted?: (id: number) => void; toast: (m: string) => void; defaultOpen?: boolean; style?: React.CSSProperties }) {
  const [p, setP] = useState(post);
  const [menu, setMenu] = useState(false);
  const [open, setOpen] = useState(defaultOpen);
  const [comments, setComments] = useState<{ id: number; comment: string; created_at: string; author_name: string; author_avatar: string }[] | null>(null);
  const [text, setText] = useState("");
  const [lightbox, setLightbox] = useState("");
  const profile = `/community/u/${encodeURIComponent(p.author_username)}/`;

  const loadComments = useCallback(async () => {
    const d = await fetch(`/api/community/${p.id}/`).then((r) => r.json()).catch(() => ({ comments: [] }));
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

  const like = async () => {
    if (!me) return goLogin();
    const d = await fetch(`/api/community/${p.id}/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "like" }) }).then((r) => r.json());
    if (d.status === "success") setP({ ...p, user_liked: d.user_liked, likes_count: d.likes_count });
    else toast(d.error || "Failed");
  };
  const send = async () => {
    if (!me) return goLogin();
    if (!text.trim()) return;
    const d = await fetch(`/api/community/${p.id}/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "comment", comment: text }) }).then((r) => r.json());
    if (d.status === "success") {
      setText("");
      setP({ ...p, comments_count: d.comments_count });
      void loadComments();
    } else toast(d.error || "Comment blocked");
  };
  const share = async () => {
    const url = `${location.origin}/community/post/${p.id}/`;
    try {
      if (navigator.share) await navigator.share({ title: `${p.author_name} on community`, url });
      else {
        await navigator.clipboard.writeText(url);
        toast("Link copied");
      }
    } catch {}
  };
  const del = async () => {
    if (!confirm("Delete this post permanently?")) return;
    const d = await fetch("/api/community/", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ post_id: p.id }) }).then((r) => r.json());
    if (d.status === "success") {
      toast("Post deleted");
      onDeleted?.(p.id);
    } else toast(d.error || "Could not delete");
  };

  return (
    <article className="comm-post" data-post-id={p.id} style={style}>
      <div className="comm-post-header">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={av(p.author_avatar)} alt="" className="comm-post-avatar" onClick={() => (location.href = profile)} onError={(e) => ((e.target as HTMLImageElement).src = DEFAULT_AVATAR)} />
        <div className="comm-post-meta">
          <Link href={profile} className="comm-post-name" rel="nofollow">
            {p.author_name}
          </Link>
          <div className="comm-post-sub" suppressHydrationWarning>
            @{p.author_username} · {timeAgo(p.created_at)} {p.category_name ? <span className="comm-post-badge">{p.category_name}</span> : null}
          </div>
        </div>
        {me && me.id === p.member_id ? (
          <div className="comm-post-menu">
            <button
              type="button"
              className="comm-post-menu-btn"
              onClick={(e) => {
                e.stopPropagation();
                setMenu((m) => !m);
              }}
            >
              <i className="fa-solid fa-ellipsis"></i>
            </button>
            <div className={`comm-post-dropdown${menu ? " open" : ""}`}>
              <button type="button" onClick={del}>
                Delete post
              </button>
            </div>
          </div>
        ) : null}
      </div>
      <div className="comm-post-body" style={{ whiteSpace: "pre-wrap" }}>
        {p.content}
      </div>
      {p.images.length ? (
        <div className={`comm-post-images ${p.images.length === 1 ? "single" : "multi"}`}>
          {p.images.map((img) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={img} src={mediaUrl(img)} alt="" loading="lazy" onClick={() => setLightbox(mediaUrl(img))} />
          ))}
        </div>
      ) : null}
      <div className="comm-post-actions">
        <button type="button" className={`comm-action${p.user_liked ? " liked" : ""}`} onClick={like}>
          <i className={p.user_liked ? "fa-solid fa-heart" : "fa-regular fa-heart"}></i> <span className="like-count">{p.likes_count}</span>
        </button>
        <button type="button" className="comm-action" onClick={() => setOpen((o) => !o)}>
          <i className="fa-regular fa-comment"></i> <span className="cmt-count">{p.comments_count}</span>
        </button>
        <button type="button" className="comm-action" onClick={share}>
          <i className="fa-solid fa-share"></i>
        </button>
      </div>
      <div className={`comm-comments${open ? " open" : ""}`}>
        <div className="comments-list">
          {comments === null && open ? (
            <p style={{ textAlign: "center", color: "#94a3b8", fontSize: ".82rem", padding: 8 }}>
              <i className="fa-solid fa-spinner fa-spin"></i>
            </p>
          ) : comments && !comments.length ? (
            <p style={{ textAlign: "center", color: "#94a3b8", fontSize: ".82rem", padding: 8 }}>No comments yet</p>
          ) : (
            comments?.map((c) => (
              <div className="comm-comment" key={c.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={av(c.author_avatar)} alt="" className="comm-comment-avatar" onError={(e) => ((e.target as HTMLImageElement).src = DEFAULT_AVATAR)} />
                <div className="comm-comment-bubble">
                  <div className="comm-comment-author">{c.author_name}</div>
                  <div className="comm-comment-text">{c.comment}</div>
                  <div className="comm-comment-time">{timeAgo(c.created_at)}</div>
                </div>
              </div>
            ))
          )}
        </div>
        {me ? (
          <div className="comm-comment-form">
            <input type="text" placeholder="Write a comment…" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} maxLength={1000} />
            <button type="button" className="comm-comment-send" onClick={send}>
              <i className="fa-solid fa-paper-plane"></i>
            </button>
          </div>
        ) : (
          <p style={{ textAlign: "center", fontSize: ".82rem", color: "#94a3b8", padding: "8px 0" }}>
            <a href="#" onClick={(e) => (e.preventDefault(), goLogin())}>
              Sign in
            </a>{" "}
            to comment
          </p>
        )}
      </div>
      {lightbox ? (
        <div className="comm-lightbox open" onClick={() => setLightbox("")}>
          <button type="button" className="comm-lightbox-close">
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
  const ta = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (open) setTimeout(() => ta.current?.focus(), 200);
  }, [open]);
  return (
    <>
      <div className={`comm-overlay${open ? " open" : ""}`} onClick={onClose}></div>
      <div className={`comm-sheet${open ? " open" : ""}`} role="dialog" aria-label="Create post">
        <div className="comm-sheet-header">
          <p className="comm-sheet-title">Create Post</p>
          <button type="button" className="comm-icon-btn" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        <form
          className="comm-sheet-body"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            setBusy(true);
            const d = await fetch("/api/community/", { method: "POST", body: new FormData(form) })
              .then((r) => r.json())
              .catch(() => ({ error: "Network error" }));
            setBusy(false);
            if (d.status === "success") {
              form.reset();
              setPreviews([]);
              onClose();
              toast("Post published");
              onPosted();
            } else toast(d.error || "Post blocked by moderation");
          }}
        >
          <textarea ref={ta} name="content" placeholder="What's on your mind? Share a novel excerpt, quote, or story…" required maxLength={5000}></textarea>
          {previews.length ? (
            <div className="comm-img-preview" style={{ display: "flex" }}>
              {previews.map((src) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={src} src={src} alt="" />
              ))}
            </div>
          ) : null}
          <div className="comm-sheet-footer">
            <select name="category_id" defaultValue="">
              <option value="">Category (optional)</option>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <label className="comm-btn comm-btn-ghost comm-btn-sm" htmlFor="postImages" style={{ cursor: "pointer", flexShrink: 0 }}>
              <i className="fa-solid fa-image"></i>
            </label>
            <input type="file" name="images" id="postImages" multiple accept="image/*" style={{ display: "none" }} onChange={(e) => setPreviews(Array.from(e.target.files || []).slice(0, 4).map((f) => URL.createObjectURL(f)))} />
            <button type="submit" className="comm-btn comm-btn-primary comm-btn-sm" style={{ flexShrink: 0 }} disabled={busy}>
              {busy ? "Posting…" : "Post"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

export default function CommunityFeed({ cats }: { cats: { id: number; name: string; slug: string }[] }) {
  const me = useMe();
  const member = me?.member || null;
  const { show, el } = useToast();
  const [sort, setSort] = useState<"for_you" | "latest">("for_you");
  const [cat, setCat] = useState(0);
  const [posts, setPosts] = useState<FeedPost[] | null>(null);
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(true);
  const [busy, setBusy] = useState(false);
  const [compose, setCompose] = useState(false);
  const [edit, setEdit] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const seed = useRef(0);

  const load = useCallback(
    async (reset: boolean) => {
      if (busy) return;
      setBusy(true);
      const pg = reset ? 1 : page;
      if (!seed.current) seed.current = Math.floor(Math.random() * 1e6);
      const d = await fetch(`/api/community/?page=${pg}&limit=10&sort=${sort}&category_id=${cat}&seed=${seed.current}`)
        .then((r) => r.json())
        .catch(() => null);
      if (d?.status === "success") {
        setPosts((old) => (reset ? d.posts : [...(old || []), ...d.posts]));
        setMore(d.has_more);
        setPage(pg + 1);
      } else if (reset) setPosts([]);
      setBusy(false);
    },
    [busy, page, sort, cat],
  );

  useEffect(() => {
    setPosts(null);
    void load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, cat]);

  useEffect(() => {
    if (!sentinel.current || !more) return;
    const io = new IntersectionObserver((e) => e[0].isIntersecting && posts && !busy && load(false), { rootMargin: "500px" });
    io.observe(sentinel.current);
    return () => io.disconnect();
  }, [more, posts, busy, load]);

  const avatar = member?.profile_pic ? mediaUrl(member.profile_pic) : DEFAULT_AVATAR;
  const loginUrl = "/login/?return=/community/";
  return (
    <>
      <div className="comm-app">
        <header className="comm-topbar comm-mobile-only">
          <h1>Community</h1>
          <div className="comm-topbar-actions">
            <button type="button" className="comm-icon-btn" title="Refresh feed" onClick={() => load(true)}>
              <i className="fa-solid fa-rotate-right"></i>
            </button>
            {member ? (
              <Link href={`/community/u/${encodeURIComponent(member.username)}/`} rel="nofollow">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={avatar} alt="" className="comm-avatar-btn" />
              </Link>
            ) : me ? (
              <Link href={loginUrl} className="comm-btn comm-btn-primary comm-btn-sm">
                Sign in
              </Link>
            ) : null}
          </div>
        </header>

        <aside className="comm-sidebar comm-desktop-only">
          <div className="comm-panel comm-profile-card">
            {member ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={avatar} alt="" className="avatar" />
                <div className="name">{member.name}</div>
                <div className="handle">@{member.username}</div>
                {member.bio ? <div className="bio">{member.bio}</div> : null}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
                  <Link href={`/community/u/${encodeURIComponent(member.username)}/`} className="comm-btn comm-btn-primary comm-btn-block" rel="nofollow">
                    My Profile
                  </Link>
                  <button type="button" className="comm-btn comm-btn-ghost comm-btn-block" onClick={() => setEdit(true)}>
                    Edit Profile
                  </button>
                  <button
                    type="button"
                    className="comm-btn comm-btn-ghost comm-btn-block"
                    style={{ color: "#dc2626" }}
                    onClick={async () => {
                      await fetch("/api/auth/logout/", { method: "POST" });
                      location.href = "/login/";
                    }}
                  >
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="name" style={{ marginBottom: 6 }}>
                  Welcome
                </div>
                <p style={{ fontSize: ".88rem", color: "#64748b", lineHeight: 1.5, margin: "0 0 14px" }}>Sign in to post, like, and comment with readers.</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <Link href={loginUrl} className="comm-btn comm-btn-primary comm-btn-block">
                    Sign In
                  </Link>
                  <Link href="/register/?return=/community/" className="comm-btn comm-btn-ghost comm-btn-block">
                    Create Account
                  </Link>
                </div>
              </>
            )}
          </div>
          <div className="comm-panel">
            <div className="comm-panel-title">Community Rules</div>
            <ul className="comm-rules">
              <li>Be respectful to others</li>
              <li>Share original or credited content</li>
              <li>No spam or abusive posts</li>
              <li>Tag a category for better reach</li>
            </ul>
          </div>
        </aside>

        <div className="comm-main">
          <div className="comm-tabs">
            <button type="button" className={`comm-tab${sort === "for_you" ? " active" : ""}`} onClick={() => setSort("for_you")}>
              For You
            </button>
            <button type="button" className={`comm-tab${sort === "latest" ? " active" : ""}`} onClick={() => setSort("latest")}>
              Latest
            </button>
          </div>
          <div className="comm-chips">
            <button type="button" className={`comm-chip${cat === 0 ? " active" : ""}`} onClick={() => setCat(0)}>
              All
            </button>
            {cats.map((c) => (
              <button key={c.id} type="button" className={`comm-chip${cat === c.id ? " active" : ""}`} onClick={() => setCat(c.id)}>
                {c.name}
              </button>
            ))}
          </div>
          {member ? (
            <div className="comm-composer-wrap comm-desktop-only">
              <button type="button" className="comm-composer-trigger" onClick={() => setCompose(true)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={avatar} alt="" />
                <span>Share a quote, excerpt, or thought…</span>
              </button>
            </div>
          ) : me ? (
            <div className="comm-guest-banner comm-desktop-only">
              <p>
                <strong>Join the conversation</strong>
                <br />
                Sign in to post, like, and comment with other readers.
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Link href={loginUrl} className="comm-btn comm-btn-primary comm-btn-sm">
                  Sign In
                </Link>
                <Link href="/register/?return=/community/" className="comm-btn comm-btn-ghost comm-btn-sm">
                  Create Account
                </Link>
              </div>
            </div>
          ) : null}
          <div className="comm-feed">
            {posts === null ? (
              <Skeletons />
            ) : !posts.length ? (
              <div className="comm-empty">
                <i className="fa-regular fa-comment-dots"></i>
                <p>No posts yet. Be the first to share something!</p>
              </div>
            ) : (
              posts.map((p) => <PostCard key={p.id} post={p} me={member} toast={show} onDeleted={(id) => setPosts((l) => (l || []).filter((x) => x.id !== id))} />)
            )}
          </div>
          <div className="comm-sentinel" ref={sentinel}></div>
        </div>

        <aside className="comm-sidebar comm-desktop-only">
          <div className="comm-panel">
            <div className="comm-panel-title">Browse Categories</div>
            <ul className="comm-link-list">
              {cats.slice(0, 12).map((c) => (
                <li key={c.id}>
                  <Link href={`/${c.slug}/`} rel="nofollow">
                    {c.name} <i className="fa-solid fa-chevron-right" style={{ fontSize: ".7rem", opacity: 0.4 }}></i>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
      {member ? (
        <button type="button" className="comm-fab comm-mobile-only" onClick={() => setCompose(true)} aria-label="Create post">
          <i className="fa-solid fa-plus"></i>
        </button>
      ) : null}
      {member ? <Composer open={compose} onClose={() => setCompose(false)} cats={cats} onPosted={() => load(true)} toast={show} /> : null}
      {edit && member ? <EditProfileModal member={member} onClose={() => setEdit(false)} /> : null}
      {el}
    </>
  );
}

export function SinglePost({ post }: { post: FeedPost }) {
  const me = useMe();
  const { show, el } = useToast();
  return (
    <>
      <PostCard post={post} me={me?.member || null} toast={show} defaultOpen onDeleted={() => (location.href = "/community/")} style={{ borderRadius: 16, border: "1px solid #e8ecf1", marginBottom: 12 }} />
      {el}
    </>
  );
}

export function ProfileOwnerActions({ username }: { username: string }) {
  const me = useMe();
  const [edit, setEdit] = useState(false);
  if (!me?.member || me.member.username !== username) return null;
  return (
    <>
      <button type="button" className="comm-btn comm-btn-ghost comm-btn-sm" onClick={() => setEdit(true)}>
        <i className="fa-solid fa-pen"></i> Edit
      </button>
      {edit ? <EditProfileModal member={me.member} onClose={() => setEdit(false)} /> : null}
    </>
  );
}
