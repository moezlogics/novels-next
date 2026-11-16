import "@/styles/tailwind.css";
import "@/styles/style.css";
import "@/styles/mobile_nav.css";
import "@/styles/critical.css";
import type { ReactNode } from "react";
import { getSettings, logoWidth, siteUrl } from "@/lib/settings";
import { hexToRgb, mediaUrl } from "@/lib/utils";
import ThirdParty from "./ThirdParty";
import InstantNav from "./InstantNav";
import JsonLd from "./JsonLd";
import { orgSchema, websiteSchema } from "@/lib/seo";

function parseMetaTags(html: string): { name?: string; property?: string; content: string }[] {
  const out: { name?: string; property?: string; content: string }[] = [];
  const re = /<meta\s+([^>]+?)\/?>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html || ""))) {
    const attrs: Record<string, string> = {};
    m[1].replace(/([a-zA-Z-]+)\s*=\s*["']([^"']*)["']/g, (_, k, v) => ((attrs[k.toLowerCase()] = v), ""));
    if (attrs.content && (attrs.name || attrs.property)) out.push({ name: attrs.name, property: attrs.property, content: attrs.content });
  }
  return out;
}

export default async function HtmlShell({ bodyClass, children }: { bodyClass: string; children: ReactNode }) {
  const s = await getSettings();
  const vars = `:root{--theme-primary:${s.theme_primary};--theme-primary-rgb:${hexToRgb(s.theme_primary)};--theme-secondary:${s.theme_secondary};--theme-secondary-rgb:${hexToRgb(s.theme_secondary)};--theme-hover:${s.theme_hover};--font-sans:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;--logo-w-m:${logoWidth(s.logo_width_mobile)};--logo-w-d:${logoWidth(s.logo_width_desktop)}}`;
  const verify = parseMetaTags(s.search_console);
  const codes: [string, string | undefined][] = [
    ["google-site-verification", s.google_verification],
    ["msvalidate.01", s.bing_verification],
    ["yandex-verification", s.yandex_verification],
    ["p:domain_verify", s.pinterest_verification],
    ["facebook-domain-verification", s.facebook_domain_verification],
  ];
  for (const [name, content] of codes) if (content && !verify.some((v) => v.name === name)) verify.push({ name, content: content.replace(/^.*content=["']([^"']+)["'].*$/i, "$1").trim() });
  const third = [s.google_analytics, s.larapush_code, s.custom_head_code, s.custom_footer_code].filter((x): x is string => !!x && !!x.trim());
  const ann = s.announcement_enabled && s.announcement_text ? s.announcement_text : "";
  const base = siteUrl();
  return (
    <html lang="en">
      <head>
        <style dangerouslySetInnerHTML={{ __html: vars }} />
        <meta name="theme-color" content={s.theme_primary} />
        {verify.map((v, i) => (v.name ? <meta key={i} name={v.name} content={v.content} /> : <meta key={i} property={v.property} content={v.content} />))}
        <JsonLd data={websiteSchema(s, base)} />
        <JsonLd data={orgSchema(s, base)} />
        {s.site_favicon ? <link rel="apple-touch-icon" href={mediaUrl(s.site_favicon)} /> : null}
        {s.custom_css ? <style dangerouslySetInnerHTML={{ __html: s.custom_css.replace(/<\/style/gi, "") }} /> : null}
      </head>
      <body className={bodyClass} suppressHydrationWarning>
        {ann ? (
          <div className="kn-announce" style={{ background: s.announcement_bg || "#0f172a", color: s.announcement_color || "#fff" }}>
            {s.announcement_link ? (
              <a href={s.announcement_link} style={{ color: "inherit" }}>
                {ann} <span aria-hidden="true">→</span>
              </a>
            ) : (
              ann
            )}
          </div>
        ) : null}
        {children}
        <InstantNav />
        {third.length ? <ThirdParty snippets={third} /> : null}
      </body>
    </html>
  );
}
