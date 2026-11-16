import type { Metadata } from "next";
import { getSettings, siteUrl } from "@/lib/settings";
import { breadcrumb, buildMeta } from "@/lib/seo";
import { whatsappUrl } from "@/lib/utils";
import JsonLd from "@/components/JsonLd";
import ContactForm from "@/components/site/ContactForm";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return buildMeta(s, siteUrl(), {
    title: s.contact_meta_title?.trim() || "Contact Us",
    description: s.contact_meta_description?.trim() || `Contact ${s.site_name} for questions, feedback, or support.`,
    path: "/contact/",
  });
}

export default async function ContactPage() {
  const s = await getSettings();
  const title = s.contact_page_title?.trim() || "Contact Us";
  const items = [
    s.contact_email ? { icon: "fa-regular fa-envelope", label: "Email", value: s.contact_email, href: `mailto:${s.contact_email}` } : null,
    s.contact_phone ? { icon: "fa-solid fa-phone", label: "Phone", value: s.contact_phone, href: `tel:${s.contact_phone.replace(/\s+/g, "")}` } : null,
    s.contact_whatsapp && whatsappUrl(s.contact_whatsapp) ? { icon: "fa-brands fa-whatsapp", label: "WhatsApp", value: s.contact_whatsapp, href: whatsappUrl(s.contact_whatsapp) } : null,
  ].filter(Boolean) as { icon: string; label: string; value: string; href: string }[];
  const socials = [
    s.facebook_url ? { icon: "fa-brands fa-facebook-f", label: "Facebook", url: s.facebook_url, cls: "sp-soc-fb" } : null,
    s.instagram_url ? { icon: "fa-brands fa-instagram", label: "Instagram", url: s.instagram_url, cls: "sp-soc-ig" } : null,
    s.tiktok_url ? { icon: "fa-brands fa-tiktok", label: "TikTok", url: s.tiktok_url, cls: "sp-soc-tt" } : null,
    s.youtube_url ? { icon: "fa-brands fa-youtube", label: "YouTube", url: s.youtube_url, cls: "sp-soc-yt" } : null,
  ].filter(Boolean) as { icon: string; label: string; url: string; cls: string }[];

  return (
    <>
      <JsonLd data={breadcrumb(siteUrl(), [{ name: title, path: "/contact/" }])} />
      <section className="static-hero">
        <div className="global-container static-hero__inner">
          <h1 className="static-hero__title">{title}</h1>
          <p className="static-hero__subtitle">{s.contact_page_subtitle?.trim() || "Have a question? We'd love to hear from you."}</p>
        </div>
      </section>
      <section className="global-container static-body">
        <div className="contact-grid">
          <aside className="static-card contact-aside">
            <h2 className="contact-aside__title">Get in Touch</h2>
            <p className="contact-aside__text">Reach us through any of the channels below. We usually respond within 48 hours.</p>
            {items.length ? (
              <ul className="contact-info-list">
                {items.map((it) => (
                  <li key={it.label}>
                    <span className="contact-info-icon">
                      <i className={it.icon}></i>
                    </span>
                    <div>
                      <span className="contact-info-label">{it.label}</span>
                      <a href={it.href} className="contact-info-value">
                        {it.value}
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
            {socials.length ? (
              <div className="contact-social">
                <span className="contact-social__label">Follow Us</span>
                <div className="contact-social__links">
                  {socials.map((so) => (
                    <a key={so.label} href={so.url} target="_blank" rel="noopener noreferrer" className={`contact-social-btn ${so.cls}`} title={so.label}>
                      <i className={so.icon}></i>
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </aside>
          <div className="static-card contact-form-card">
            <ContactForm />
          </div>
        </div>
        {s.contact_page_content?.trim() ? (
          <div className="static-card static-card--wide contact-extra">
            <div className="static-prose" dangerouslySetInnerHTML={{ __html: s.contact_page_content }} />
          </div>
        ) : null}
      </section>
    </>
  );
}
