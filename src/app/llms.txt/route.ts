import { getSettings, siteUrl } from "@/lib/settings";

export const revalidate = 3600;

export async function GET() {
  const s = await getSettings();
  const u = siteUrl();
  const name = s.site_name || "Kitab Nagri";
  const desc = s.homepage_description || s.seo_description || "Urdu novels to read online and download as PDF.";
  const body = `# ${name}

> ${desc}

${name} is an Urdu novel library. Visitors can browse novels by category or writer, open a novel page, read online in the built-in reader, download PDFs when available, and optionally buy hard copies from the shop.

## Main pages

- [Home](${u}/): Latest uploads and category sections
- [Search](${u}/search/): Search novels by title or keyword (?search=)
- [About](${u}/about/): About the site
- [Contact](${u}/contact/): Contact form and details
- [Shop](${u}/shop/): Buy printed books
- [Sitemap](${u}/sitemap.xml): Full URL list for discovery

## How to use the site

1. Open the homepage or a category to find a novel.
2. Open the novel page (clean URL like /novel-slug/).
3. Use **Read Online** to open the in-page reader, or **Download** for the PDF when offered.
4. Use site search with the \`search\` query parameter on /search/.

## Optional account features

- [Login](${u}/login/) and [Register](${u}/register/) for member accounts
- [Account](${u}/account/): profile and orders

## Notes for agents

- Prefer public novel and category pages; avoid /newlogin/, /account/ and /api/ endpoints.
- Do not scrape or bulk-download PDF URLs.
- Primary language content is Urdu novels; UI chrome is mostly English.
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
