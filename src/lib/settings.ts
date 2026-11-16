import "server-only";
import { unstable_cache } from "next/cache";
import { col } from "./db";
import type { Settings } from "./types";

export const DEFAULT_SETTINGS: Settings = {
  _id: 1,
  site_name: "Kitab Nagri",
  tagline: "Read Online & Download Urdu Novels",
  site_logo: "",
  site_favicon: "",
  homepage_featured_image: "",
  contact_email: "",
  contact_phone: "",
  contact_whatsapp: "",
  facebook_url: "",
  instagram_url: "",
  tiktok_url: "",
  youtube_url: "",
  seo_description: "",
  seo_keywords: "",
  homepage_title: "",
  homepage_description: "",
  permalink_structure: "postname",
  maintenance_mode: false,
  google_analytics: "",
  search_console: "",
  larapush_code: "",
  theme_primary: "#0f2c5c",
  theme_secondary: "#1a56db",
  theme_hover: "#fbbf24",
  footer_col1: "",
  footer_col2: "",
  footer_col3: "",
  logo_width_desktop: "auto",
  logo_width_mobile: "auto",
  about_page_title: "",
  about_page_subtitle: "",
  about_meta_title: "",
  about_meta_description: "",
  about_page_content: "",
  contact_page_title: "",
  contact_page_subtitle: "",
  contact_meta_title: "",
  contact_meta_description: "",
  contact_page_content: "",
  community_coming_soon: false,
  shop_coming_soon: false,
  community_preview_key: "",
  shop_preview_key: "",
  homepage_content_title: "",
  homepage_content: "",
  banner_mobile: [],
  banner_desktop: [],
  homepage_famous_ids: [],
  homepage_famous_title: "",
  categories_page_title: "",
  categories_page_subtitle: "",
  categories_meta_title: "",
  categories_meta_description: "",
  categories_page_content: "",
  shipping_fee: 150,
  free_shipping_over: 3000,
  cod_enabled: true,
  bank_details: "",

  announcement_enabled: false,
  announcement_text: "",
  announcement_link: "",
  announcement_bg: "#0f172a",
  announcement_color: "#ffffff",
  maintenance_message: "",

  seo_title_sep: "|",
  seo_tpl_novel: "%title%",
  seo_tpl_category: "%title%",
  seo_tpl_writer: "%title%",
  seo_tpl_page: "%title%",
  seo_tpl_product: "%title% — Buy Printed Book %sep% %site%",
  seo_tpl_store: "%title% — Books by this seller %sep% %site%",
  twitter_handle: "",
  noindex_search: true,
  robots_extra: "",
  google_verification: "",
  bing_verification: "",
  yandex_verification: "",
  pinterest_verification: "",
  facebook_domain_verification: "",

  twitter_url: "",
  pinterest_url: "",
  telegram_url: "",

  google_api_key: "",
  reader_preload: true,
  download_enabled: true,
  comments_enabled: true,

  custom_head_code: "",
  custom_footer_code: "",
  custom_css: "",

  shop_title: "Bookstore",
  shop_description: "Order printed Urdu novels from writers and sellers across Pakistan. Cash on delivery.",
  shop_indexable: true,
  min_order_amount: 0,
  max_qty_per_item: 10,
  checkout_note: "",
  return_policy: "",

  sellers_enabled: true,
  seller_registration_open: true,
  seller_approval_required: false,
  seller_review_first: 3,
  seller_daily_limit: 10,
  seller_max_images: 6,
  seller_min_price: 100,
  seller_max_price: 25000,
  seller_spam_threshold: 45,
  seller_banned_words: "",
  seller_terms: "",
};

/** Fill a title template: %title% %writer% %site% %sep% */
export function fillTitle(s: Settings, tpl: string | undefined, vars: Record<string, string>): string {
  const t = (tpl || "%title%").trim() || "%title%";
  const all: Record<string, string> = { site: s.site_name, sep: s.seo_title_sep || "|", ...vars };
  return t
    .replace(/%(\w+)%/g, (_, k: string) => all[k] ?? "")
    .replace(/\s+[|·—–:-]\s*$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export async function readSettingsUncached(): Promise<Settings> {
  try {
    const doc = await (await col.settings()).findOne({ _id: 1 });
    return { ...DEFAULT_SETTINGS, ...(doc || {}) } as Settings;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** Cached site settings — busted by revalidateTag('content') when admin saves. */
export const getSettings = unstable_cache(readSettingsUncached, ["settings-v1"], {
  tags: ["content", "settings"],
  revalidate: 600,
});

export function siteUrl(): string {
  return (process.env.SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
}

export function absUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return siteUrl() + (path.startsWith("/") ? path : "/" + path);
}

export function logoWidth(v: string): string {
  const s = String(v || "auto").trim();
  return /^\d+$/.test(s) ? s + "px" : s || "auto";
}
