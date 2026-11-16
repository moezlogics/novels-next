import { getCarouselCategories } from "@/lib/data";
import { featureOpen } from "@/lib/comingSoon";
import { getSettings } from "@/lib/settings";
import CommunityFeed from "@/components/community/Community";
import ComingSoon from "@/components/site/ComingSoon";
import PreviewCookie from "@/components/site/PreviewCookie";

export const dynamic = "force-dynamic";
export const metadata = { title: { absolute: "Community — Readers' Feed" }, description: "Share quotes, excerpts and thoughts with other Urdu novel readers.", robots: "noindex, nofollow", alternates: { canonical: "/community/" } };

export default async function CommunityPage({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  const { preview } = await searchParams;
  const [s, open, cats] = await Promise.all([getSettings(), featureOpen("community", preview), getCarouselCategories()]);
  if (!open) return <ComingSoon title="Community" headline="Coming soon" subtitle="Our readers' community is almost ready. Check back soon!" siteName={s.site_name} />;
  return (
    <>
      {preview ? <PreviewCookie feature="community" token={preview} /> : null}
      <CommunityFeed cats={cats.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))} />
    </>
  );
}
