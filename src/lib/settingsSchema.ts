import type { Settings } from "./types";

/**
 * Every admin setting in one list. The Settings screen and the save action are both
 * built from it, so a new setting is one line here (plus where the site uses it).
 */

export type FieldType = "text" | "textarea" | "code" | "number" | "bool" | "image" | "color" | "select" | "secret" | "url" | "email";

export interface Field {
  k: keyof Settings;
  label: string;
  type?: FieldType;
  help?: string;
  ph?: string;
  options?: { v: string; l: string }[];
  rows?: number;
  half?: boolean;
  max?: number;
}

export interface Section {
  title: string;
  icon: string;
  help?: string;
  fields: Field[];
}

export interface Tab {
  id: string;
  label: string;
  icon: string;
  sections: Section[];
}

const TPL_HELP = "Placeholders: %title% %site% %sep%. A custom SEO title on the item always wins.";

export const SETTINGS_TABS: Tab[] = [
  {
    id: "general",
    label: "General",
    icon: "fa-globe",
    sections: [
      {
        title: "Site identity",
        icon: "fa-id-card",
        fields: [
          { k: "site_name", label: "Site name", max: 100 },
          { k: "tagline", label: "Tagline", max: 255 },
          { k: "site_logo", label: "Logo", type: "image", half: true },
          { k: "site_favicon", label: "Favicon (square, 512×512)", type: "image", half: true },
          { k: "logo_width_desktop", label: "Logo width (desktop)", ph: "auto or 160", half: true, max: 20 },
          { k: "logo_width_mobile", label: "Logo width (mobile)", ph: "auto or 120", half: true, max: 20 },
        ],
      },
      {
        title: "Announcement bar",
        icon: "fa-bullhorn",
        help: "A thin bar at the very top of every public page — for news, offers or new releases.",
        fields: [
          { k: "announcement_enabled", label: "Show the announcement bar", type: "bool" },
          { k: "announcement_text", label: "Text", max: 300, ph: "New novel out now: …" },
          { k: "announcement_link", label: "Link (optional)", type: "url", ph: "/new-novel-slug/" },
          { k: "announcement_bg", label: "Background", type: "color", half: true },
          { k: "announcement_color", label: "Text colour", type: "color", half: true },
        ],
      },
      {
        title: "Maintenance",
        icon: "fa-person-digging",
        fields: [
          { k: "maintenance_mode", label: "Maintenance mode (visitors see a “back soon” page; the admin panel keeps working)", type: "bool" },
          { k: "maintenance_message", label: "Maintenance message", type: "textarea", rows: 2, max: 500 },
        ],
      },
    ],
  },
  {
    id: "seo",
    label: "SEO",
    icon: "fa-magnifying-glass-chart",
    sections: [
      {
        title: "Homepage",
        icon: "fa-house",
        fields: [
          { k: "homepage_title", label: "Homepage title", max: 255, help: "Best between 50 and 60 characters." },
          { k: "homepage_description", label: "Homepage meta description", type: "textarea", rows: 3, max: 1000, help: "Best between 120 and 160 characters." },
          { k: "seo_description", label: "Default meta description (pages without their own)", type: "textarea", rows: 3, max: 1000 },
          { k: "seo_keywords", label: "Keywords", max: 1000 },
          { k: "homepage_featured_image", label: "Default share image (WhatsApp / Facebook, 1200×630)", type: "image" },
        ],
      },
      {
        title: "Title templates",
        icon: "fa-heading",
        help: TPL_HELP,
        fields: [
          {
            k: "seo_title_sep",
            label: "Separator",
            type: "select",
            options: ["|", "-", "–", "—", "·", ":"].map((v) => ({ v, l: v })),
            half: true,
          },
          { k: "twitter_handle", label: "X / Twitter handle", ph: "@kitabnagri", half: true, max: 40 },
          { k: "seo_tpl_novel", label: "Novel pages", max: 200 },
          { k: "seo_tpl_category", label: "Category pages", max: 200 },
          { k: "seo_tpl_writer", label: "Writer pages", max: 200 },
          { k: "seo_tpl_page", label: "Custom pages", max: 200 },
          { k: "seo_tpl_product", label: "Bookstore products", max: 200 },
          { k: "seo_tpl_store", label: "Seller stores", max: 200 },
        ],
      },
      {
        title: "Indexing",
        icon: "fa-robot",
        fields: [
          { k: "noindex_search", label: "Keep search result pages out of Google (recommended)", type: "bool" },
          { k: "robots_extra", label: "Extra robots.txt lines", type: "code", rows: 4, max: 5000, ph: "Disallow: /private-page/" },
        ],
      },
      {
        title: "Site verification",
        icon: "fa-circle-check",
        help: "Paste only the code from the content=\"…\" part.",
        fields: [
          { k: "google_verification", label: "Google Search Console", half: true, max: 200 },
          { k: "bing_verification", label: "Bing Webmaster", half: true, max: 200 },
          { k: "yandex_verification", label: "Yandex", half: true, max: 200 },
          { k: "pinterest_verification", label: "Pinterest", half: true, max: 200 },
          { k: "facebook_domain_verification", label: "Facebook domain", half: true, max: 200 },
          { k: "search_console", label: "Other verification tags (full <meta> tags)", type: "code", rows: 2, max: 5000 },
        ],
      },
    ],
  },
  {
    id: "contact",
    label: "Contact & Social",
    icon: "fa-address-book",
    sections: [
      {
        title: "Contact",
        icon: "fa-envelope",
        fields: [
          { k: "contact_email", label: "Email", type: "email", half: true, max: 100 },
          { k: "contact_phone", label: "Phone", half: true, max: 50 },
          { k: "contact_whatsapp", label: "WhatsApp", ph: "03xxxxxxxxx", half: true, max: 50 },
        ],
      },
      {
        title: "Social profiles",
        icon: "fa-share-nodes",
        help: "Also sent to Google as your organisation's profiles.",
        fields: [
          { k: "facebook_url", label: "Facebook", type: "url", half: true },
          { k: "instagram_url", label: "Instagram", type: "url", half: true },
          { k: "tiktok_url", label: "TikTok", type: "url", half: true },
          { k: "youtube_url", label: "YouTube", type: "url", half: true },
          { k: "twitter_url", label: "X / Twitter", type: "url", half: true },
          { k: "pinterest_url", label: "Pinterest", type: "url", half: true },
          { k: "telegram_url", label: "Telegram", type: "url", half: true },
        ],
      },
    ],
  },
  {
    id: "reading",
    label: "Reading",
    icon: "fa-book-open-reader",
    sections: [
      {
        title: "Reader & downloads",
        icon: "fa-book-open",
        fields: [
          { k: "reader_preload", label: "Start loading the reader in the background on novel pages (opens instantly; skipped on 2G / data saver)", type: "bool" },
          { k: "download_enabled", label: "Show the Download button", type: "bool" },
        ],
      },
      {
        title: "Comments",
        icon: "fa-comments",
        fields: [{ k: "comments_enabled", label: "Allow comments on novels", type: "bool" }],
      },
    ],
  },
  {
    id: "shop",
    label: "Bookstore",
    icon: "fa-store",
    sections: [
      {
        title: "Bookstore",
        icon: "fa-store",
        fields: [
          { k: "shop_coming_soon", label: "Bookstore: coming soon (only people with the preview link can see it)", type: "bool" },
          { k: "shop_indexable", label: "Let Google index the bookstore (products and seller stores)", type: "bool" },
          { k: "shop_title", label: "Bookstore name", max: 80, half: true },
          { k: "shop_description", label: "Bookstore meta description", type: "textarea", rows: 2, max: 300 },
        ],
      },
      {
        title: "Shipping & checkout (site's own books)",
        icon: "fa-truck",
        help: "Sellers set their own shipping in their dashboard.",
        fields: [
          { k: "shipping_fee", label: "Shipping fee (Rs)", type: "number", half: true },
          { k: "free_shipping_over", label: "Free shipping over (Rs, 0 = never)", type: "number", half: true },
          { k: "min_order_amount", label: "Minimum order (Rs, 0 = none)", type: "number", half: true },
          { k: "max_qty_per_item", label: "Max copies per book in one order", type: "number", half: true },
          { k: "cod_enabled", label: "Cash on delivery", type: "bool" },
          { k: "bank_details", label: "Bank / Easypaisa / JazzCash details (shown at checkout, optional)", type: "textarea", rows: 3, max: 1000 },
          { k: "checkout_note", label: "Note shown on the checkout page", type: "textarea", rows: 2, max: 500 },
          { k: "return_policy", label: "Return policy (shown on product pages)", type: "textarea", rows: 3, max: 2000 },
        ],
      },
    ],
  },
  {
    id: "sellers",
    label: "Sellers",
    icon: "fa-user-tie",
    sections: [
      {
        title: "Seller accounts",
        icon: "fa-user-plus",
        help: "Writers and publishers sell their own books. No commission: buyers pay the seller on delivery.",
        fields: [
          { k: "sellers_enabled", label: "Seller marketplace is on", type: "bool" },
          { k: "seller_registration_open", label: "Anyone can create a seller account (if off, only admins create them)", type: "bool" },
          { k: "seller_approval_required", label: "New seller accounts wait for admin approval", type: "bool" },
          { k: "seller_terms", label: "Seller rules shown at sign-up", type: "textarea", rows: 4, max: 5000 },
        ],
      },
      {
        title: "Spam brain",
        icon: "fa-shield-halved",
        help: "Phone numbers, WhatsApp, emails and links are always blocked in seller text (including tricks like “0 3 0 0” or “zero three”).",
        fields: [
          { k: "seller_review_first", label: "Admin reviews each new seller's first … products", type: "number", half: true },
          { k: "seller_daily_limit", label: "Max new products per seller per day", type: "number", half: true },
          { k: "seller_max_images", label: "Max photos per product", type: "number", half: true },
          { k: "seller_spam_threshold", label: "Spam score that sends a product to review (0–100, lower = stricter)", type: "number", half: true },
          { k: "seller_min_price", label: "Lowest allowed price (Rs)", type: "number", half: true },
          { k: "seller_max_price", label: "Highest allowed price (Rs)", type: "number", half: true },
          { k: "seller_banned_words", label: "Extra banned words (one per line)", type: "textarea", rows: 4, max: 5000 },
        ],
      },
    ],
  },
  {
    id: "code",
    label: "Code & Tracking",
    icon: "fa-code",
    sections: [
      {
        title: "Analytics & push",
        icon: "fa-chart-line",
        help: "Scripts load after the visitor first scrolls or taps, so they never slow the page.",
        fields: [
          { k: "google_analytics", label: "Google Analytics code", type: "code", rows: 5, max: 20000 },
          { k: "larapush_code", label: "LaraPush code", type: "code", rows: 4, max: 20000 },
        ],
      },
      {
        title: "Custom code",
        icon: "fa-file-code",
        fields: [
          { k: "custom_head_code", label: "Extra code for <head> (scripts load after first interaction)", type: "code", rows: 4, max: 20000 },
          { k: "custom_footer_code", label: "Extra code before </body>", type: "code", rows: 4, max: 20000 },
          { k: "custom_css", label: "Custom CSS", type: "code", rows: 6, max: 50000 },
        ],
      },
    ],
  },
  {
    id: "community",
    label: "Community",
    icon: "fa-people-group",
    sections: [
      {
        title: "Community",
        icon: "fa-people-group",
        fields: [{ k: "community_coming_soon", label: "Community: coming soon (only people with the preview link can see it)", type: "bool" }],
      },
    ],
  },
];

export function tabById(id: string) {
  return SETTINGS_TABS.find((t) => t.id === id) || SETTINGS_TABS[0];
}
