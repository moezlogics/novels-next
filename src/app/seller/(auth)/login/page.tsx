import Link from "next/link";
import { redirect } from "next/navigation";
import { getSeller } from "@/lib/sellerAuth";
import { getSettings } from "@/lib/settings";
import { LoginForm } from "@/components/seller/SellerForms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Seller login" };

export default async function SellerLogin() {
  if (await getSeller()) redirect("/seller/");
  const s = await getSettings();
  return (
    <div className="sl-auth">
      <div className="sl-card">
        <Link href="/" className="sl-brand" style={{ marginBottom: 18 }}>
          <span className="lg">
            <i className="fa-solid fa-store"></i>
          </span>
          <span>{s.site_name} · Seller Center</span>
        </Link>
        <h1>Log in to sell your books</h1>
        <p className="sl-muted sl-small" style={{ marginTop: 0 }}>
          Manage your books, orders and earnings.
        </p>
        <LoginForm />
        {s.sellers_enabled !== false && s.seller_registration_open !== false ? (
          <p className="sl-small sl-muted" style={{ textAlign: "center", marginTop: 14 }}>
            New writer or publisher? <Link href="/seller/register/">Create a free seller account</Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}
