import { getSettings } from "@/lib/settings";
import { getMember } from "@/lib/auth";
import { CheckoutView, ShopNav } from "@/components/shop/ShopUI";

export const dynamic = "force-dynamic";
export const metadata = { title: { absolute: "Checkout" }, robots: "noindex, nofollow" };

export default async function CheckoutPage() {
  const [s, m] = await Promise.all([getSettings(), getMember()]);
  return (
    <>
      <ShopNav title="Checkout" back="/shop/cart/" />
      <div className="shop-container">
        <CheckoutView member={m ? { name: m.name, email: m.email, phone: m.phone || "" } : null} note={s.checkout_note} bank={s.bank_details} />
      </div>
    </>
  );
}
