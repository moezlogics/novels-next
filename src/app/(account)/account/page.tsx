import { col } from "@/lib/db";
import { getMember, publicMember } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import AcctTopNav from "@/components/account/TopNav";
import AccountHome from "@/components/account/AccountHome";

export const dynamic = "force-dynamic";
export const metadata = { title: { absolute: "My Account" }, description: "Manage your profile, orders, and saved novels.", robots: "noindex, nofollow", alternates: { canonical: "/account/" } };

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ need_phone?: string }> }) {
  const [m, s] = await Promise.all([getMember(), getSettings()]);
  const orders = m ? await (await col.orders()).countDocuments({ member_id: m._id }) : 0;
  const needPhone = !!(await searchParams).need_phone && !!m && !m.phone;
  return (
    <>
      <AcctTopNav title="Account" back="/" />
      <AccountHome member={m ? publicMember(m) : null} orderCount={orders} communityOpen={!s.community_coming_soon} needPhone={needPhone} />
    </>
  );
}
