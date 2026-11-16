import Link from "next/link";
import { redirect } from "next/navigation";
import { getSeller } from "@/lib/sellerAuth";
import { getSettings } from "@/lib/settings";
import { RegisterForm } from "@/components/seller/SellerForms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Become a seller" };

export default async function SellerRegister() {
  if (await getSeller()) redirect("/seller/");
  const s = await getSettings();
  const open = s.sellers_enabled !== false && s.seller_registration_open !== false;
  return (
    <div className="sl-auth">
      <div className="sl-card" style={{ maxWidth: 560 }}>
        <Link href="/" className="sl-brand" style={{ marginBottom: 18 }}>
          <span className="lg">
            <i className="fa-solid fa-store"></i>
          </span>
          <span>{s.site_name} · Seller Center</span>
        </Link>
        <h1>Sell your books on {s.site_name}</h1>
        <ul className="sl-small sl-muted" style={{ margin: "6px 0 16px", paddingLeft: 18 }}>
          <li>
            <b>0% commission.</b> You keep the full price.
          </li>
          <li>Readers order online and pay you cash on delivery.</li>
          <li>Your own store page, order tracking and sales stats.</li>
        </ul>
        {open ? (
          <RegisterForm terms={s.seller_terms || ""} />
        ) : (
          <div className="sl-alert info">
            Seller sign-up is closed right now. Please <Link href="/contact/">contact us</Link> and we will create an account for you.
          </div>
        )}
      </div>
    </div>
  );
}
