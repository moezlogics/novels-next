"use server";
import fs from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { col, nextId } from "@/lib/db";
import { back, bool, bustSite, file, imageFrom, int, num, requireAdmin, str } from "@/lib/admin";
import { saveImage, storageDir } from "@/lib/storage";
import type { Banner, Settings } from "@/lib/types";
import { tabById } from "@/lib/settingsSchema";

async function patch(p: Partial<Settings>) {
  await (await col.settings()).updateOne({ _id: 1 }, { $set: p }, { upsert: true });
  bustSite();
}

export async function saveTheme(fd: FormData) {
  await requireAdmin(true);
  const hex = (k: string, d: string) => (/^#[0-9a-f]{3,8}$/i.test(str(fd, k)) ? str(fd, k) : d);
  await patch({ theme_primary: hex("theme_primary", "#0f2c5c"), theme_secondary: hex("theme_secondary", "#1a56db"), theme_hover: hex("theme_hover", "#fbbf24") });
  back("/newlogin/theme/", "Theme colors saved ✓");
}

export async function savePageContent(fd: FormData) {
  await requireAdmin(true);
  const tab = str(fd, "tab");
  const keys: Record<string, (keyof Settings)[]> = {
    home: ["homepage_content_title", "homepage_content"],
    about: ["about_page_title", "about_page_subtitle", "about_meta_title", "about_meta_description", "about_page_content"],
    contact: ["contact_page_title", "contact_page_subtitle", "contact_meta_title", "contact_meta_description", "contact_page_content"],
    categories: ["categories_page_title", "categories_page_subtitle", "categories_meta_title", "categories_meta_description", "categories_page_content"],
  };
  const p: Record<string, string> = {};
  for (const k of keys[tab] || []) p[k] = str(fd, k);
  await patch(p as Partial<Settings>);
  back(`/newlogin/page-content/?tab=${tab}`, "Content saved ✓");
}

export async function saveFamous(fd: FormData) {
  await requireAdmin(true);
  const ids = str(fd, "ids")
    .split(",")
    .map((x) => parseInt(x, 10))
    .filter((x) => x > 0)
    .slice(0, 24);
  await patch({ homepage_famous_ids: ids, homepage_famous_title: str(fd, "famous_title", 120) });
  back("/newlogin/famous/", "Famous novels saved ✓");
}

export async function saveBanners(fd: FormData) {
  await requireAdmin(true);
  const out: Record<"banner_mobile" | "banner_desktop", Banner[]> = { banner_mobile: [], banner_desktop: [] };
  for (const set of ["banner_mobile", "banner_desktop"] as const) {
    const imgs = fd.getAll(`${set}_img`).map(String);
    const links = fd.getAll(`${set}_link`).map(String);
    const ws = fd.getAll(`${set}_w`).map(String);
    const hs = fd.getAll(`${set}_h`).map(String);
    const removes = fd.getAll(`${set}_remove`).map(String);
    imgs.forEach((img, i) => {
      if (img && !removes.includes(String(i))) out[set].push({ img, link: links[i] || "", w: +ws[i] || 0, h: +hs[i] || 0 });
    });
    for (const f of fd.getAll(`${set}_new`)) {
      if (f instanceof File && f.size) {
        const s = await saveImage(f, { alt: "banner" });
        out[set].push({ img: s.path, link: str(fd, `${set}_newlink`, 500), w: s.width, h: s.height });
      }
    }
  }
  await patch(out);
  back("/newlogin/banners/", "Banners saved ✓");
}

export async function saveSettings(fd: FormData) {
  await requireAdmin(true);
  const tab = tabById(str(fd, "__tab"));
  const p: Record<string, unknown> = {};
  for (const sec of tab.sections)
    for (const f of sec.fields) {
      const k = f.k as string;
      if (f.type === "bool") p[k] = bool(fd, k);
      else if (f.type === "image") p[k] = await imageFrom(fd, k, k.replace(/_/g, " "));
      else if (f.type === "number") p[k] = Math.max(0, num(fd, k) ?? 0);
      else if (f.type === "color") p[k] = /^#[0-9a-f]{3,8}$/i.test(str(fd, k)) ? str(fd, k) : undefined;
      else if (f.type === "secret" && !str(fd, k) && fd.get(k) === null) continue;
      else p[k] = str(fd, k, f.max || (f.type === "code" ? 50000 : 2000));
      if (p[k] === undefined) delete p[k];
    }
  if (tab.id === "general") p.site_name = String(p.site_name || "") || "Kitab Nagri";
  if (p.logo_width_desktop === "") p.logo_width_desktop = "auto";
  if (p.logo_width_mobile === "") p.logo_width_mobile = "auto";
  if (typeof p.twitter_handle === "string" && p.twitter_handle && !p.twitter_handle.startsWith("@")) p.twitter_handle = "@" + p.twitter_handle;

  const s = await (await col.settings()).findOne({ _id: 1 });
  if (!s?.community_preview_key) p.community_preview_key = randomBytes(12).toString("hex");
  if (!s?.shop_preview_key) p.shop_preview_key = randomBytes(12).toString("hex");
  const js = file(fd, "larapush_file");
  if (js && /\.js$/i.test(js.name) && js.size < 512 * 1024) {
    await fs.mkdir(storageDir("root"), { recursive: true });
    await fs.writeFile(storageDir("root", js.name.replace(/[^\w.-]/g, "")), Buffer.from(await js.arrayBuffer()));
  }
  await patch(p as Partial<Settings>);
  back(`/newlogin/settings/?tab=${tab.id}`, `${tab.label} settings saved ✓`);
}

// ── Menus ────────────────────────────────────────────────────
type MenuKind = "menu" | "footerMenu";
const MENU_PATH: Record<MenuKind, string> = { menu: "/newlogin/menu/", footerMenu: "/newlogin/footer-menu/" };

export async function addMenu(fd: FormData) {
  await requireAdmin(true);
  const kind = str(fd, "kind") as MenuKind;
  const label = str(fd, "label", 120);
  if (!label) back(MENU_PATH[kind], "Label is required", "err");
  const c = await col[kind]();
  const last = await c.find({}).sort({ sort_order: -1 }).limit(1).toArray();
  await c.insertOne({ _id: await nextId(kind === "menu" ? "menu_items" : "footer_menu_items"), label, url: str(fd, "url", 255), parent_id: int(fd, "parent_id") || null, sort_order: (last[0]?.sort_order || 0) + 1 });
  bustSite();
  back(MENU_PATH[kind], "Menu item added");
}

export async function saveMenu(fd: FormData) {
  await requireAdmin(true);
  const kind = str(fd, "kind") as MenuKind;
  const c = await col[kind]();
  const ids = fd.getAll("id").map((x) => parseInt(String(x), 10));
  const labels = fd.getAll("label").map(String);
  const urls = fd.getAll("url").map(String);
  const parents = fd.getAll("parent_id").map((x) => parseInt(String(x), 10) || null);
  const orders = fd.getAll("sort_order").map((x) => parseInt(String(x), 10) || 0);
  const del = fd.getAll("delete").map((x) => parseInt(String(x), 10));
  for (let i = 0; i < ids.length; i++) {
    if (del.includes(ids[i])) await c.deleteOne({ _id: ids[i] });
    else await c.updateOne({ _id: ids[i] }, { $set: { label: labels[i].trim(), url: urls[i].trim(), parent_id: parents[i] === ids[i] ? null : parents[i], sort_order: orders[i] } });
  }
  if (del.length) await c.updateMany({ parent_id: { $in: del } }, { $set: { parent_id: null } });
  bustSite();
  back(MENU_PATH[kind], "Menu saved ✓");
}
