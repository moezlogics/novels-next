# Kitab Nagri — Next.js 16 + MongoDB

The PHP site (`../novels`) rebuilt on a modern stack, with the **same design, same URLs, same SEO and all existing data**.

- **Next.js 16** (App Router, React 19, Turbopack) · **MongoDB 8** · **TypeScript**
- Same CSS files as the PHP site → identical UI
- Same URL structure: `/novel-slug/`, `/category-slug/`, `/writer-slug/`, `/about/`, `/shop/…`
- Old PHP links (`/single.php?id=…`, `/archive.php?category=…`, `/about.php`, `/reader.php?id=…`) → 301 to the new URL
- Readers keep their bookmarks: localStorage keys (`rdr_pos_*`, `rdr_bm_*`) are unchanged

---

## 1. First-time setup (local)

```bash
npm install
```

Start MongoDB (Windows service, admin PowerShell):

```bash
net start MongoDB
```

Copy all data from the old MySQL database (safe to run again — it replaces):

```bash
npm run migrate
```

Run the site:

```bash
npm run dev
```

- Site: http://localhost:3000
- Admin: http://localhost:3000/newlogin/ (same username/password as the PHP admin)

Forgot the admin password?

```bash
npm run create-admin -- admin NewPassword123
```

---

## 2. What's new

### Reader (the main fix)
Why the PHP reader was slow: novels are Word/InPage PDFs that embed the **whole Urdu Nastaleeq font (6–9 MB)**. Any reader that opens the PDF itself must download that font before page 1 can show.

How the new reader works (the same idea as the Kitab Nagri Flutter app, inside our own reader screen):
1. The novel opens in **Google Drive's own page viewer** (`drive.google.com/file/d/<id>/preview`), embedded inside our reader. Google turns the pages into small images on its own servers, so readers never download the 6–9 MB font, and **our server does no work and stores nothing**.
2. The viewer is **sandboxed**: Google's toolbar, "open in Drive" and pop-out buttons cannot open anything, so readers stay on our site.
3. **Instant open:** when a reader hovers or touches the Read button (or focuses it), the reader starts loading invisibly in the background, so pages are usually already there when they tap.
4. Our reader adds a top bar, **themes (Classic / Sepia / Night)**, brightness, fullscreen, focus mode, a slow-internet notice with retry, the phone back button, and keeps the screen awake.
5. **Bookmarks:** Google's viewer shows the page number (e.g. "Page 45 / 1229"). The reader types it into *Bookmark* in the settings; the button then says **"Continue · Page 45"**, and it appears on the homepage and the Saved page.
6. The Download button goes straight to Google's download, so it uses no bandwidth on our server.

Trade-off: the viewer belongs to Google, so the site cannot read the current page by itself (bookmarking is manual), and offline reading is not available. In return it scales to any number of readers at zero server cost.

**After deploying,** open Admin → *Tools & Cache* → **Check all Drive links** once. It finds Drive files that are private or deleted, so they can be fixed before readers see an error.

- **Continue Reading** row on the homepage, and progress/bookmarks **sync across devices** for signed-in members.

### Seller marketplace (`/seller/`)
- Writers and publishers create a free seller account at **/seller/register/** (or the admin creates one in *Bookstore → Sellers*). **0% commission**: buyers pay the seller cash on delivery.
- Seller Center: dashboard with earnings, views, orders and 30-day charts · add/edit books with up to 6 photos · stock · orders (Accept → Ship with courier + tracking number → Delivered) · store profile (logo, banner, shipping fee, return policy) · account.
- Every seller gets a public store page **/shop/seller/<store>/** (indexed by Google, with Store schema).
- **Spam brain** (`src/lib/spamBrain.ts`): blocks phone numbers (also "0 3 0 0", "O3OO", "zero three", Urdu digits), WhatsApp/Telegram words, links, emails and @handles in every seller field; scores scam words, ALL CAPS, fake discounts and duplicates; optional OpenAI second opinion. Risky books and each new seller's first books go to the admin's **Books in review** queue with the reasons.
- A checkout with books from several sellers becomes one order per seller (own shipping fee, own tracking). Buyers track every parcel on one page.
- Admin sees everything: all sellers with books/orders/sales/strikes, approve/suspend/verify/trust, reset password, and "Open their dashboard".

### CMS settings (`/newlogin/settings/`)
Tabs: General (logo, announcement bar, maintenance message) · SEO (title templates, verification codes for Google/Bing/Yandex/Pinterest/Facebook, robots.txt lines, X handle) · Contact & Social · Reading (reader preload, downloads, comments, **Google Drive API key**) · Bookstore (shipping, minimum order, max copies, bank details, checkout note, return policy, indexing) · Sellers (sign-up, approval, review rules, limits, banned words) · Code (analytics, custom head/footer code, custom CSS). Also **Redirects** (301/302) for changed links.

**Faster downloads:** Google's normal download link waits 5–30 s before big files start. Add a free *Google Drive API key* in Settings → Reading (Google Cloud Console → enable "Google Drive API" → Credentials → API key → restrict it to your domain and the Drive API). Downloads then start at once and show progress.

### Admin panel (`/newlogin/`)
Everything from the PHP panel (novels, categories, writers, series, comments, contact messages, pages, products, orders, members, media, theme, menus, footer menu, page content, famous novels, banners, settings, profile, users) plus:
- Dashboard with views / reads / downloads and most-read novels
- Novel form: **Auto-detect size & pages** from the Drive link, multi-category picker (★ = primary), SEO preview, media library
- Bulk actions (publish, draft, delete, check Drive links), filters and sorting
- Reply to comments as admin, order status with stock restore on cancel, member suspend/delete, community moderation
- Live theme preview with presets, ordered "Famous novels" picker

---

## 3. Deploy on the live server (VPS / CloudPanel)

Requirements: **Node.js 20+** (24 recommended) and **MongoDB** (local or MongoDB Atlas).

1. Upload this folder (without `node_modules` and `.next`).
2. Create `.env.local` from `.env.example` and set:
   - `MONGODB_URI` (e.g. Atlas connection string), `MONGODB_DB=novels`
   - `SITE_URL=https://kitabnagri.com.pk`
   - `AUTH_SECRET` = a long random string
   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (same as PHP), `OPENAI_API_KEY`, `DISCORD_WEBHOOK_URL` (optional)
   - `MYSQL_*` + `LEGACY_UPLOAD_DIR` only for the one-time migration
3. Install, migrate, build:

```bash
npm ci
```

```bash
npm run migrate
```

```bash
npm run build
```

4. Run with PM2 (keeps it alive and restarts it if it stops). The settings are in `ecosystem.config.js` (app name `kitabnagricompk`, port 3115):

```bash
pm2 start ecosystem.config.js
```

```bash
pm2 save
```

After every new `npm run build`:

```bash
pm2 reload kitabnagricompk
```

5. Point Nginx at port 3115 (CloudPanel: the Node.js site's app port):

```nginx
server {
    server_name kitabnagri.com.pk www.kitabnagri.com.pk;
    client_max_body_size 64m;
    location / {
        proxy_pass http://127.0.0.1:3115;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_buffering off;   # stream PDFs without delay
    }
}
```

6. In Admin → **Tools & Cache** click **Check all Drive links** (once).
7. LaraPush: upload the `firebase-messaging-sw.js` file again in Admin → Settings (it is served from the site root).
8. Set up Cloudflare (next section).

Server size: 1–2 GB RAM is enough. The reader uses no server CPU, disk or bandwidth, because Google serves the pages.

### Folders
- `storage/images`, `storage/uploads` — covers, writer photos, community uploads (copied by `npm run migrate`)
- Back up `storage/` and the MongoDB database.

---

## 3b. Cloudflare (Free plan) — recommended settings

The reader's pages come from Google, not through Cloudflare, so no reader cache rules are needed. Cloudflare only serves the site pages, covers and scripts.

In the Cloudflare dashboard:
1. **Caching → Tiered Cache → Smart Tiered Cache: ON** (free). Covers and scripts are then fetched from one upper tier instead of each Pakistan data centre asking your server.
2. **Speed → Optimization → Protocol:** HTTP/3 (with QUIC) ON, 0-RTT ON, Early Hints ON. These help most on Pakistani mobile networks.
3. **Rocket Loader: OFF** (it breaks React/Next.js). Brotli is automatic.
4. **SSL/TLS:** Full (strict).
5. Do **not** create a "cache everything" rule for HTML pages. Next.js already serves them from its own cache, and admin edits update them right away.

Covers (`/images/…webp`) and `/_next/static/…` files already send long cache headers, so Cloudflare caches them without any rule.

---

## 4. Useful commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / start |
| `npm run migrate` | Copy MySQL data + uploaded images into MongoDB/storage |
| `npm run create-admin -- user pass` | Create or reset an admin |
| `npm run icons` | Regenerate the icon CSS after using a new `fa-*` icon |

## 5. Project map

```
src/app/(site)        public pages (home, /[slug]/, categories, about, contact, search)
src/app/(account)     login, register, account, orders, saved
src/app/(community)   community feed, posts, profiles
src/app/(shop)        bookstore, product, cart, checkout, order tracking
src/app/newlogin      admin panel
src/app/api           JSON APIs (pdf, search, comments, auth, community, shop, reading sync)
src/components/reader reader screen around Google Drive's viewer (DriveReader.tsx)
src/lib               db, auth, data queries, SEO, storage, PDF cache
src/proxy.ts          old PHP URL → new URL redirects
scripts/              migrate.ts, create-admin.ts
```
