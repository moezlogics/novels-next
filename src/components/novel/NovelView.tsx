import Link from "next/link";
import type { CommentView, NovelDetail } from "@/lib/data";
import { preconnect } from "react-dom";
import { getSettings, siteUrl } from "@/lib/settings";
import { bookSchema, breadcrumb } from "@/lib/seo";
import { cleanDescription, extractDriveId, mediaUrl, placeholderCover, thumbUrl } from "@/lib/utils";
import JsonLd from "../JsonLd";
import Ico from "../Icons";
import Comments from "./Comments";
import { DownloadButton, EpisodeList, NovelTracker, ReadButton } from "./NovelClient";
import { WhatsAppGlyph } from "../site/WhatsAppFab";

function RelCard({ p }: { p: { id: number; title: string; slug: string; image: string } }) {
  return (
    <Link className="sp-rel-card" href={`/${p.slug}/`}>
      <span className="sp-rel-cover">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.image ? thumbUrl(p.image, 200) : placeholderCover(p.title)} alt={`${p.title} novel cover`} loading="lazy" decoding="async" width={120} height={180} />
      </span>
      <span className="sp-rel-title">{p.title}</span>
    </Link>
  );
}

export default async function NovelView({ novel: n, comments }: { novel: NovelDetail; comments: CommentView[] }) {
  const base = siteUrl();
  const s = await getSettings();
  const url = `${base}/${n.slug}/`;
  const readId = extractDriveId(n.read_online_url);
  const dl = { apiKey: s.google_api_key || "", size: n.pdf_size || 0, site: s.site_name };
  if (readId) {
    // open the connections to Google's viewer in the page's first bytes (before any JS runs)
    preconnect("https://drive.google.com");
    preconnect("https://www.gstatic.com", { crossOrigin: "anonymous" });
    preconnect("https://drive.google.com", { crossOrigin: "use-credentials" });
  }
  const dlId = extractDriveId(n.download_url);
  const cover = n.image ? thumbUrl(n.image, 400) : placeholderCover(n.title);
  const showShop = n.product && !s.shop_coming_soon;
  const hasSeries = n.series && n.seasons.length > 1;

  return (
    <>
      <JsonLd data={bookSchema(base, { ...n, writer: n.writer })} />
      <JsonLd data={breadcrumb(base, [...(n.category ? [{ name: n.category.name, path: `/${n.category.slug}/` }] : []), { name: n.title, path: `/${n.slug}/` }])} />
      {hasSeries ? (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: `${n.series!.name} — Seasons`,
            itemListOrder: "https://schema.org/ItemListOrderAscending",
            numberOfItems: n.seasons.length,
            itemListElement: n.seasons.map((x, i) => ({ "@type": "ListItem", position: i + 1, url: `${base}/${x.slug}/`, name: x.title })),
          }}
        />
      ) : null}
      <NovelTracker id={n.id} catId={n.category?.id || 0} />

      <div className="sp-wrap">
        <div className="sp-hero">
          <div className="sp-hero-img">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt={n.title} fetchPriority="high" loading="eager" decoding="async" width={260} height={390} />
            {showShop ? (
              <div className="sp-buy-now-wrap">
                <Link href={`/shop/${n.product!.slug}/`} className="sp-buy-now-btn" rel="nofollow">
                  <Ico name="shop" /> Buy Hard Book
                </Link>
              </div>
            ) : null}
          </div>
          <div className="sp-hero-info">
            <h1 className="sp-title">{n.title}</h1>
            <div className="sp-meta-row">
              {n.writer ? (
                <span className="sp-meta-item">
                  <Ico name="user" style={{ width: "0.75rem", height: "0.75rem" }} strokeWidth={2.5} />
                  <Link href={`/${n.writer.slug}/`}>{n.writer.name}</Link>
                </span>
              ) : null}
              {s.comments_enabled !== false ? (
                <span className="sp-meta-item">
                  <Ico name="chat" style={{ width: "0.75rem", height: "0.75rem" }} strokeWidth={2.5} />
                  <a href="#comments" style={{ textDecoration: "none", color: "inherit" }}>
                    {comments.length} Comments
                  </a>
                </span>
              ) : null}
              {n.pages ? (
                <span className="sp-meta-item">
                  <i className="fa-regular fa-file-lines" style={{ width: "0.75rem", height: "0.75rem" }}></i>
                  {n.pages} pages
                </span>
              ) : null}
            </div>

            {n.read_online_url || n.download_url || s.whatsapp_channel_url ? (
              <div className="sp-actions-wrap">
                {readId ? (
                  <ReadButton pid={n.id} driveId={readId} title={n.title} totalPages={n.pages || 0} cover={cover} dl={dl} preload={s.reader_preload !== false} />
                ) : n.read_online_url ? (
                  <a href={n.read_online_url} target="_blank" rel="nofollow noopener noreferrer" className="sp-btn sp-btn-read">
                    <Ico name="read" /> Read Online Free
                  </a>
                ) : null}
                {n.download_url && s.download_enabled !== false ? (
                  dlId ? (
                    <DownloadButton pid={n.id} driveId={dlId} title={n.title} dl={dlId === readId ? dl : { apiKey: dl.apiKey, site: dl.site }} />
                  ) : (
                    <a href={n.download_url} target="_blank" rel="nofollow noopener noreferrer" className="sp-btn sp-btn-dl">
                      <Ico name="download" /> Download Free
                    </a>
                  )
                ) : null}
                {s.whatsapp_channel_url ? (
                  <a href={s.whatsapp_channel_url} target="_blank" rel="noopener" className="sp-btn sp-btn-wa">
                    <WhatsAppGlyph /> Join WhatsApp Channel
                  </a>
                ) : null}
              </div>
            ) : null}
            {n.episodes.length ? <EpisodeList pid={n.id} title={n.title} cover={cover} episodes={n.episodes} dl={{ site: s.site_name }} downloads={s.download_enabled !== false} /> : null}
          </div>
        </div>

        <div className="sp-table-wrap">
          <table className="sp-table">
            <tbody>
              <tr>
                <td>Novel Name</td>
                <td>{n.title}</td>
              </tr>
              {n.writer ? (
                <tr>
                  <td>Writer / Author</td>
                  <td>
                    <Link href={`/${n.writer.slug}/`} style={{ color: "var(--theme-secondary)", fontWeight: 600, textDecoration: "none" }}>
                      {n.writer.name}
                    </Link>
                  </td>
                </tr>
              ) : null}
              {n.categories.length ? (
                <tr>
                  <td>Category</td>
                  <td>
                    {n.categories.map((c, i) => (
                      <span key={c.slug}>
                        {i ? ", " : ""}
                        <Link href={`/${c.slug}/`} style={{ color: "var(--theme-secondary)", fontWeight: 600, textDecoration: "none" }}>
                          {c.name}
                        </Link>
                      </span>
                    ))}
                  </td>
                </tr>
              ) : null}
              {n.file_size ? (
                <tr>
                  <td>File Size</td>
                  <td>{n.file_size}</td>
                </tr>
              ) : null}
              {n.file_type ? (
                <tr>
                  <td>File Format</td>
                  <td>{n.file_type}</td>
                </tr>
              ) : null}
              {n.pages ? (
                <tr>
                  <td>Pages</td>
                  <td>{n.pages}</td>
                </tr>
              ) : null}
              {n.series ? (
                <tr>
                  <td>Series</td>
                  <td>
                    {n.series.name}
                    {n.season_number ? (
                      <>
                        {" "}
                        — <strong>Season {n.season_number}</strong>
                      </>
                    ) : null}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {n.description ? <div className="sp-content" dangerouslySetInnerHTML={{ __html: cleanDescription(n.description) }} /> : null}

        <div className="sp-share">
          <span className="sp-share-label">Share:</span>
          <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener" className="sp-share-btn sp-share-fb" title="Facebook">
            <i className="fa-brands fa-facebook-f"></i>
          </a>
          <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`${n.title} - ${url}`)}`} target="_blank" rel="noopener" className="sp-share-btn sp-share-wa" title="WhatsApp">
            <i className="fa-brands fa-whatsapp"></i>
          </a>
          <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`} target="_blank" rel="noopener" className="sp-share-btn sp-share-li" title="LinkedIn">
            <i className="fa-brands fa-linkedin-in"></i>
          </a>
        </div>

        {n.writer ? (
          <div className="sp-author-card">
            {n.writer.profile_pic ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediaUrl(n.writer.profile_pic)} alt={n.writer.name} className="sp-author-avatar" />
            ) : (
              <div className="sp-author-avatar">{n.writer.name.charAt(0).toUpperCase()}</div>
            )}
            <div className="sp-author-details">
              <h2 className="sp-author-heading">
                <Link href={`/${n.writer.slug}/`} className="sp-author-name">
                  About {n.writer.name}
                </Link>
              </h2>
              <p className="sp-author-bio">{n.writer.short_bio || `Read all novels and books written by ${n.writer.name} online or download in PDF format on our platform.`}</p>
            </div>
          </div>
        ) : null}

        {hasSeries || n.relatedWriter.length || n.relatedCategory.length ? (
          <section className="sp-internal" aria-label="Related novels">
            {hasSeries ? (
              <nav className="sp-series-bar" aria-label={`${n.series!.name} seasons`}>
                <span className="sp-series-bar-label">{n.series!.name}</span>
                <div className="sp-series-tabs" role="list">
                  {n.seasons.map((x) => {
                    const label = x.season_number ? `S${x.season_number}` : "Part";
                    const full = (x.season_number ? `Season ${x.season_number}: ` : "") + x.title;
                    return x.id === n.id ? (
                      <span key={x.id} className="sp-series-tab is-current" role="listitem" aria-current="page" title={full}>
                        {label}
                      </span>
                    ) : (
                      <Link key={x.id} className="sp-series-tab" role="listitem" href={`/${x.slug}/`} title={full}>
                        {label}
                      </Link>
                    );
                  })}
                </div>
              </nav>
            ) : null}
            {n.relatedWriter.length && n.writer ? (
              <div className="sp-rel-block">
                <div className="sp-rel-head">
                  <h2 className="sp-internal-heading">More by {n.writer.name}</h2>
                  <Link className="sp-rel-all" href={`/${n.writer.slug}/`}>
                    All →
                  </Link>
                </div>
                <div className="sp-rel-grid">
                  {n.relatedWriter.map((p) => (
                    <RelCard key={p.id} p={p} />
                  ))}
                </div>
              </div>
            ) : null}
            {n.relatedCategory.length && n.category ? (
              <div className="sp-rel-block">
                <div className="sp-rel-head">
                  <h2 className="sp-internal-heading">More in {n.category.name}</h2>
                  <Link className="sp-rel-all" href={`/${n.category.slug}/`}>
                    All →
                  </Link>
                </div>
                <div className="sp-rel-grid">
                  {n.relatedCategory.map((p) => (
                    <RelCard key={p.id} p={p} />
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {s.comments_enabled !== false ? <Comments postId={n.id} comments={comments} /> : null}
      </div>
    </>
  );
}
