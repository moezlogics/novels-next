import { serveSitemapIndex } from "@/lib/sitemap";

export const dynamic = "force-dynamic";

export function GET() {
  return serveSitemapIndex();
}
