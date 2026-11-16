import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ArchiveView from "@/components/site/ArchiveView";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ search?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = ((await searchParams).search || "").trim();
  const s = await getSettings();
  return {
    title: { absolute: `Search: ${q}` },
    description: `Showing results matching keyword: "${q}"`,
    robots: s.noindex_search === false ? "index, follow" : "noindex, follow",
    alternates: { canonical: "/search/" },
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const q = ((await searchParams).search || "").trim().slice(0, 100);
  if (!q) redirect("/");
  return <ArchiveView kind="search" search={q} />;
}
