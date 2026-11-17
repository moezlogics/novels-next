// Data model — field names mirror the old MySQL columns so the migration is 1:1.

export interface Post {
  _id: number;
  title: string;
  slug: string;
  category_id: number | null; // primary category
  additional_categories: number[];
  category_ids: number[]; // primary + additional (for fast queries)
  writer_id: number | null;
  series_id: number | null;
  season_number: number | null;
  description: string;
  image: string;
  read_online_url: string;
  pdf_size?: number; // bytes of the Drive PDF (filled automatically)
  episodes?: Episode[]; // novels published in episodes / parts
  download_url: string;
  file_size: string;
  file_type: string;
  pages: number | null;
  posted_date: Date;
  updated_at: Date;
  status: "active" | "draft";
  is_featured: boolean;
  meta_title: string;
  meta_description: string;
  views?: number;
  reads?: number;
  downloads?: number;
}

export interface EpisodeLink {
  url: string; // Google Drive (opens in our reader) or any website (nofollow)
  label?: string;
}

export interface Episode {
  title: string;
  links: EpisodeLink[];
}

export interface Category {
  _id: number;
  name: string;
  slug: string;
  description: string;
  image: string;
  meta_title: string;
  meta_description: string;
}

export interface Writer {
  _id: number;
  name: string;
  slug: string;
  bio: string;
  short_bio: string;
  profile_pic: string;
  meta_title: string;
  meta_description: string;
}

export interface Series {
  _id: number;
  name: string;
  slug: string;
  created_at: Date;
}

export interface Page {
  _id: number;
  title: string;
  slug: string;
  content: string;
  meta_title: string;
  meta_description: string;
  status: "publish" | "draft" | "trash";
  created_at: Date;
  updated_at: Date;
}

export interface Comment {
  _id: number;
  post_id: number;
  member_id: number | null;
  parent_id: number | null;
  name: string;
  email: string;
  ip_address: string;
  is_admin: boolean;
  message: string;
  status: "pending" | "approved";
  created_at: Date;
  /** Name of the person this reply answers (reply to a reply). */
  reply_to?: string | null;
  /** Id of the exact comment that was answered (the thread root is parent_id). */
  reply_to_id?: number | null;
  /** Hash of the normalised text: duplicate / copy-paste spam detection. */
  msg_hash?: string;
  /** Why the brain or the AI held this comment for review (admin only). */
  flag_reason?: string;
  spam_score?: number;
}

export interface Member {
  _id: number;
  google_id: string | null;
  name: string;
  username: string;
  email: string;
  phone: string | null;
  password_hash: string | null;
  profile_pic: string | null;
  bio: string | null;
  status: "active" | "suspended";
  created_at: Date;
  bookmarks?: Record<string, number>; // post_id -> page (synced from reader)
}

export interface MemberInterest {
  member_id: number;
  category_id: number;
  weight: number;
  updated_at: Date;
}

export interface CommunityPost {
  _id: number;
  member_id: number;
  category_id: number | null;
  content: string;
  images: string[];
  created_at: Date;
  likes_count?: number;
  comments_count?: number;
  views?: number; // times the post was seen in the feed by other people
  /** set when the post announces a story episode (the episode's likes and comments live on this post) */
  story?: { id: number; n: number; title: string; ep: string };
}

/** A member's own novel, written in text, published episode by episode. */
export interface Story {
  _id: number;
  member_id: number;
  title: string;
  description: string;
  cover: string;
  category_id: number | null;
  status: "ongoing" | "complete";
  episodes: number;
  views: number;
  created_at: Date;
  updated_at: Date;
}

export interface StoryEpisode {
  _id: number;
  story_id: number;
  member_id: number;
  n: number; // episode number, 1-based
  title: string;
  content: string;
  views: number;
  post_id: number; // the feed post that carries this episode's likes and comments
  created_at: Date;
  updated_at: Date;
}

export interface CommunityLike {
  member_id: number;
  post_id: number;
  created_at: Date;
}

export interface CommunityComment {
  _id: number;
  post_id: number;
  member_id: number;
  comment: string;
  created_at: Date;
}

export interface ContactQuery {
  _id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  ip_address: string;
  status: "new" | "read" | "archived";
  created_at: Date;
}

export interface Media {
  _id: number;
  filename: string;
  original_name: string;
  path: string;
  alt_text: string;
  caption: string;
  description: string;
  mime: string;
  filesize: number;
  width: number;
  height: number;
  created_at: Date;
}

export interface MenuItem {
  _id: number;
  label: string;
  url: string;
  parent_id: number | null;
  sort_order: number;
}

export type ProductStatus = "active" | "inactive" | "pending" | "rejected";

export interface Product {
  _id: number;
  post_id: number | null;
  seller_id?: number | null; // null/undefined = sold by the site itself
  title: string;
  slug: string;
  description: string; // HTML for admin products, plain text for seller products
  price: number;
  sale_price: number | null;
  stock: number;
  image: string;
  gallery_images: string[];
  video_url: string;
  status: ProductStatus;
  meta_title: string;
  meta_description: string;
  created_at: Date;
  updated_at?: Date;
  // book details
  author?: string;
  language?: string;
  pages_count?: number;
  binding?: "paperback" | "hardcover" | "";
  condition?: "new" | "used";
  isbn?: string;
  category_id?: number | null;
  tags?: string[];
  // marketplace
  views?: number;
  sold?: number;
  rating_avg?: number;
  rating_count?: number;
  spam_score?: number;
  review_reasons?: string[];
  reviewed_by?: string;
  reviewed_at?: Date;
}

export interface OrderItem {
  product_id: number;
  title: string;
  quantity: number;
  price: number;
  image?: string;
  slug?: string;
}

export type OrderStatus = "pending" | "processing" | "shipped" | "completed" | "cancelled";

export interface Order {
  _id: number;
  member_id: number | null;
  seller_id?: number | null; // one order per seller; null = the site's own stock
  checkout_id?: string; // orders placed together share this
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  subtotal: number;
  shipping: number;
  total: number;
  payment_method: string;
  status: OrderStatus;
  tracking_token: string;
  courier?: string;
  tracking_number?: string;
  items: OrderItem[];
  notes?: string;
  history?: { status: OrderStatus; at: Date; by: string; note?: string }[];
  created_at: Date;
  updated_at?: Date;
}

export interface Seller {
  _id: number;
  name: string; // the person
  store_name: string;
  slug: string;
  email: string;
  phone: string; // private: admin + order handling only
  password_hash: string;
  bio: string;
  logo: string;
  banner: string;
  city: string;
  status: "pending" | "active" | "suspended";
  verified: boolean;
  created_by: "self" | "admin";
  shipping_fee: number;
  free_shipping_over: number;
  processing_days: number;
  return_policy: string;
  approved_products: number; // trust: products an admin approved
  strikes: number; // blocked spam attempts
  notes?: string; // admin-only
  last_login?: Date;
  created_at: Date;
  updated_at?: Date;
}

export interface ProductReview {
  _id: number;
  product_id: number;
  seller_id: number | null;
  member_id: number;
  name: string;
  rating: number;
  text: string;
  status: "approved" | "pending";
  created_at: Date;
}

export interface Redirect {
  _id: number;
  from: string; // path, e.g. /old-novel/
  to: string;
  code: 301 | 302;
  hits: number;
  created_at: Date;
}

export interface AdminUser {
  _id: number;
  username: string;
  email: string;
  password: string;
  bio: string;
  profile_pic: string;
  role: "main_admin" | "author";
  created_at: Date;
}

export interface ReadingProgress {
  member_id: number;
  post_id: number;
  page: number;
  total: number;
  scroll: number;
  zoom: number;
  bookmark: number | null;
  updated_at: Date;
}

export interface Banner {
  img: string;
  link?: string;
  w?: number;
  h?: number;
}

export interface Settings {
  _id: number;
  site_name: string;
  tagline: string;
  site_logo: string;
  site_favicon: string;
  homepage_featured_image: string;
  contact_email: string;
  contact_phone: string;
  contact_whatsapp: string;
  facebook_url: string;
  instagram_url: string;
  tiktok_url: string;
  youtube_url: string;
  seo_description: string;
  seo_keywords: string;
  homepage_title: string;
  homepage_description: string;
  permalink_structure: string;
  maintenance_mode: boolean;
  google_analytics: string;
  search_console: string;
  larapush_code: string;
  theme_primary: string;
  theme_secondary: string;
  theme_hover: string;
  footer_col1: string;
  footer_col2: string;
  footer_col3: string;
  logo_width_desktop: string;
  logo_width_mobile: string;
  about_page_title: string;
  about_page_subtitle: string;
  about_meta_title: string;
  about_meta_description: string;
  about_page_content: string;
  contact_page_title: string;
  contact_page_subtitle: string;
  contact_meta_title: string;
  contact_meta_description: string;
  contact_page_content: string;
  community_coming_soon: boolean;
  shop_coming_soon: boolean;
  community_preview_key: string;
  shop_preview_key: string;
  homepage_content_title: string;
  homepage_content: string;
  banner_mobile: Banner[];
  banner_desktop: Banner[];
  homepage_famous_ids: number[];
  homepage_famous_title: string;
  categories_page_title: string;
  categories_page_subtitle: string;
  categories_meta_title: string;
  categories_meta_description: string;
  categories_page_content: string;
  shipping_fee?: number;
  free_shipping_over?: number;
  cod_enabled?: boolean;
  bank_details?: string;

  // ── CMS settings (all optional: DEFAULT_SETTINGS fills them) ──
  announcement_enabled?: boolean;
  announcement_text?: string;
  announcement_link?: string;
  announcement_bg?: string;
  announcement_color?: string;
  maintenance_message?: string;

  seo_title_sep?: string;
  seo_tpl_novel?: string;
  seo_tpl_category?: string;
  seo_tpl_writer?: string;
  seo_tpl_page?: string;
  seo_tpl_product?: string;
  seo_tpl_store?: string;
  twitter_handle?: string;
  noindex_search?: boolean;
  robots_extra?: string;
  google_verification?: string;
  bing_verification?: string;
  yandex_verification?: string;
  pinterest_verification?: string;
  facebook_domain_verification?: string;

  whatsapp_channel_url?: string;
  twitter_url?: string;
  pinterest_url?: string;
  telegram_url?: string;

  google_api_key?: string;
  reader_preload?: boolean;
  download_enabled?: boolean;
  comments_enabled?: boolean;

  custom_head_code?: string;
  custom_footer_code?: string;
  custom_css?: string;

  shop_title?: string;
  shop_description?: string;
  shop_indexable?: boolean;
  min_order_amount?: number;
  max_qty_per_item?: number;
  checkout_note?: string;
  return_policy?: string;

  sellers_enabled?: boolean;
  seller_registration_open?: boolean;
  seller_approval_required?: boolean;
  seller_review_first?: number;
  seller_daily_limit?: number;
  seller_max_images?: number;
  seller_min_price?: number;
  seller_max_price?: number;
  seller_spam_threshold?: number;
  seller_banned_words?: string;
  seller_terms?: string;
}

/** Light card shape used by grids. */
export interface PostCard {
  id: number;
  title: string;
  slug: string;
  image: string;
  writer_name: string;
}
