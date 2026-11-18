import { serveSubSitemap } from "@/lib/sitemap";

export const dynamic = "force-dynamic";

export function GET() {
  return serveSubSitemap("pages");
}
