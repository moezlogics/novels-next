import Link from "next/link";
import type { ReactNode } from "react";
import { mediaUrl } from "@/lib/utils";
import type { StoryCard } from "@/lib/community";

/** Top bar of an inner community page: back arrow, title, optional action on the right. */
export function SubTop({ back, title, children }: { back: string; title: string; children?: ReactNode }) {
  return (
    <header className="cm-top cm-subtop">
      <Link href={back} rel="nofollow" className="cm-back" aria-label="Back">
        <i className="fa-solid fa-arrow-left"></i>
      </Link>
      <h1>{title}</h1>
      <span className="cm-top-end">{children}</span>
    </header>
  );
}

/** The three section tabs, as links (the feed page uses buttons for the first two). */
export function SectionTabs({ active }: { active: "for_you" | "latest" | "stories" }) {
  return (
    <nav className="cm-tabs" aria-label="Community sections">
      <Link href="/community/" rel="nofollow" className={active === "for_you" ? "on" : ""}>
        For you
      </Link>
      <Link href="/community/" rel="nofollow" className={active === "latest" ? "on" : ""}>
        Latest
      </Link>
      <Link href="/community/stories/" rel="nofollow" className={active === "stories" ? "on" : ""}>
        Stories
      </Link>
    </nav>
  );
}

export function StoryCover({ cover, title }: { cover: string; title: string }) {
  return (
    <span className="cm-story-cover" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {cover ? <img src={mediaUrl(cover)} alt="" loading="lazy" /> : <b>{title.trim().charAt(0).toUpperCase()}</b>}
    </span>
  );
}

export function StoryRow({ s, showAuthor = true }: { s: StoryCard; showAuthor?: boolean }) {
  return (
    <Link href={`/community/story/${s.id}/`} className="cm-story" rel="nofollow">
      <StoryCover cover={s.cover} title={s.title} />
      <span className="cm-story-txt">
        <b dir="auto">{s.title}</b>
        <small>
          {showAuthor ? `${s.author_name} · ` : ""}
          {s.episodes} {s.episodes === 1 ? "episode" : "episodes"} · {s.status === "complete" ? "Complete" : "Ongoing"}
        </small>
        {s.description ? <em dir="auto">{s.description}</em> : null}
      </span>
    </Link>
  );
}
