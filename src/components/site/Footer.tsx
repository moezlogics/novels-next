import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { getFooterMenu } from "@/lib/data";
import { menuHref, normalizeSocial, thumbUrl, whatsappUrl } from "@/lib/utils";

const shopRel = (u: string) => (/\/shop(\/|$)/i.test(u) ? "nofollow" : undefined);

export default async function Footer() {
  const [s, tree] = await Promise.all([getSettings(), getFooterMenu()]);
  const columns = tree.filter((t) => t.children.length).map((t) => ({ label: t.label, url: menuHref(t.url), links: t.children.map((c) => ({ label: c.label, url: menuHref(c.url) })) }));
  let flat = tree.filter((t) => !t.children.length).map((t) => ({ label: t.label, url: menuHref(t.url) }));
  if (!columns.length && !flat.length) {
    flat = [
      { label: "Privacy Policy", url: "/privacy-policy/" },
      { label: "Terms of Service", url: "/terms-of-service/" },
    ];
  }

  const socials = [
    { key: s.facebook_url, label: "Facebook", icon: "fa-brands fa-facebook-f", mod: "sf-social--fb" },
    { key: s.instagram_url, label: "Instagram", icon: "fa-brands fa-instagram", mod: "sf-social--ig" },
    { key: s.tiktok_url, label: "TikTok", icon: "fa-brands fa-tiktok", mod: "sf-social--tt" },
    { key: s.youtube_url, label: "YouTube", icon: "fa-brands fa-youtube", mod: "sf-social--yt" },
  ]
    .map((x) => ({ ...x, url: normalizeSocial(x.key) }))
    .filter((x) => x.url);
  const wa = whatsappUrl(s.contact_whatsapp);
  if (wa) socials.push({ key: "", label: "WhatsApp", icon: "fa-brands fa-whatsapp", mod: "sf-social--wa", url: wa });

  return (
    <footer className="site-footer sf">
      <div className="sf-inner">
        <div className="sf-top">
          <div className="sf-brand">
            {s.site_logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumbUrl(s.site_logo, 400)} alt={s.site_name} className="sf-logo" width={200} height={54} loading="lazy" decoding="async" />
            ) : (
              <p className="sf-site-name">{s.site_name}</p>
            )}
            <p className="sf-desc">{s.homepage_description || s.seo_description || "Your ultimate platform for Urdu novels."}</p>
          </div>

          <nav className="sf-nav" aria-label="Footer">
            {columns.map((col, i) => (
              <div className="sf-nav-col" key={i}>
                {col.url && col.url !== "#" && col.url !== "/" ? (
                  <Link className="sf-nav-heading" href={col.url} rel={shopRel(col.url)}>
                    {col.label}
                  </Link>
                ) : (
                  <p className="sf-nav-heading">{col.label}</p>
                )}
                <ul className="sf-nav-list">
                  {col.links.map((l, j) => (
                    <li key={j}>
                      <Link href={l.url} rel={shopRel(l.url)}>
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {flat.length ? (
              <div className="sf-nav-col">
                <p className="sf-nav-heading">{columns.length ? "More" : "Quick Links"}</p>
                <ul className="sf-nav-list sf-nav-list--pills">
                  {flat.map((l, j) => (
                    <li key={j}>
                      <Link href={l.url} rel={shopRel(l.url)}>
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </nav>

          {socials.length ? (
            <div className="sf-social-block">
              <p className="sf-nav-heading">Follow Us</p>
              <ul className="sf-socials">
                {socials.map((soc) => (
                  <li className="sf-social-item" key={soc.label}>
                    <a href={soc.url} className={`sf-social ${soc.mod}`} target="_blank" rel="noopener noreferrer" aria-label={soc.label} title={soc.label}>
                      <i className={soc.icon} aria-hidden="true"></i>
                      <span className="sf-social-label">{soc.label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
        <div className="sf-bottom">
          <p className="sf-copy">
            &copy; 2020–{new Date().getFullYear()} {s.site_name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
