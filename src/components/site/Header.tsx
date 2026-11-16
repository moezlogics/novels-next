import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { getCarouselCategories, getNavMenu } from "@/lib/data";
import { menuHref, thumbUrl } from "@/lib/utils";
import Ico from "../Icons";
import { HeaderSearch, MobileDrawer, MobileSearchButton } from "./HeaderClient";

export interface NavItem {
  label: string;
  url: string;
  children: { label: string; url: string }[];
}

const isShop = (u: string, l: string) => /\/shop(\/|$)/i.test(u) || l.toLowerCase() === "shop";
const isComm = (u: string, l: string) => /\/community(\/|$)/i.test(u) || l.toLowerCase() === "community";

export async function getNavLinks(): Promise<NavItem[]> {
  const [s, tree] = await Promise.all([getSettings(), getNavMenu()]);
  let links: NavItem[] = tree.map((t) => ({ label: t.label, url: menuHref(t.url), children: t.children.map((c) => ({ label: c.label, url: menuHref(c.url) })) }));
  if (!links.length) {
    const cats = (await getCarouselCategories()).slice(0, 8);
    links = [
      { label: "Home", url: "/", children: [] },
      ...cats.map((c) => ({ label: c.name, url: `/${c.slug}/`, children: [] })),
      { label: "Shop", url: "/shop/", children: [] },
      { label: "Community", url: "/community/", children: [] },
      { label: "About Us", url: "/about/", children: [] },
      { label: "Contact", url: "/contact/", children: [] },
    ];
  }
  return links.filter((l) => !(s.shop_coming_soon && isShop(l.url, l.label)) && !(s.community_coming_soon && isComm(l.url, l.label)));
}

const shopRel = (u: string) => (/\/shop(\/|$)/i.test(u) ? "nofollow" : undefined);

export default async function Header() {
  const [s, links] = await Promise.all([getSettings(), getNavLinks()]);
  const year = new Date().getFullYear();
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 transition-colors duration-300" style={{ backgroundColor: "var(--theme-primary)" }}>
      <div className="global-container">
        <div className="flex items-center justify-between py-1.5 md:py-2 gap-4">
          <div className="flex items-center shrink-0 lg:hidden">
            <MobileDrawer links={links} siteName={s.site_name} year={year}>
              <Ico name="menu" className="text-xl" />
            </MobileDrawer>
          </div>

          <div className="flex flex-grow justify-center lg:flex-grow-0 lg:justify-start">
            <Link href="/" className="flex items-center">
              {s.site_logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumbUrl(s.site_logo, 400)} alt={s.site_name} className="logo-img object-contain" width={120} height={40} fetchPriority="high" decoding="async" />
              ) : (
                <span className="text-lg md:text-xl font-bold tracking-tight text-white">{s.site_name}</span>
              )}
            </Link>
          </div>

          <div className="flex items-center shrink-0 gap-3 ml-auto">
            <div className="hidden lg:flex items-center">
              <HeaderSearch />
            </div>
            <nav className="hidden lg:block">
              <ul className="flex items-center gap-0.5" style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {links.map((link, i) =>
                  link.children.length ? (
                    <li key={i} className="relative group">
                      <button type="button" className="px-3.5 py-2 rounded-full text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-all whitespace-nowrap flex items-center gap-1 bg-transparent border-none cursor-pointer">
                        <span>{link.label}</span>
                        <i className="fa-solid fa-chevron-down text-[10px] opacity-70 group-hover:rotate-180 transition-transform duration-200"></i>
                      </button>
                      <ul className="absolute left-0 mt-1 w-48 bg-white text-slate-800 rounded-xl shadow-xl border border-slate-100 py-2 hidden group-hover:block z-50" style={{ listStyle: "none" }}>
                        {link.children.map((c, j) => (
                          <li key={j}>
                            <a href={c.url} rel={shopRel(c.url)} className="block px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-theme-secondary transition-all">
                              {c.label}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ) : (
                    <li key={i}>
                      <Link href={link.url} rel={shopRel(link.url)} className="px-3.5 py-2 rounded-full text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-all whitespace-nowrap">
                        {link.label}
                      </Link>
                    </li>
                  ),
                )}
              </ul>
            </nav>
            <MobileSearchButton />
          </div>
        </div>
      </div>
    </header>
  );
}
