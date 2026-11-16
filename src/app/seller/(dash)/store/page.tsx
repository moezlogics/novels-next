import { requireSeller } from "@/lib/sellerAuth";
import StoreForm from "@/components/seller/StoreForm";

export const metadata = { title: "My store" };

export default async function SellerStore() {
  const s = await requireSeller({ allowInactive: true });
  return (
    <>
      <h1 className="sl-h1">
        My store
        <span className="sp" />
        {s.status === "active" ? (
          <a className="sl-btn ghost sm" href={`/shop/seller/${s.slug}/`} target="_blank">
            <i className="fa-solid fa-eye"></i> View store
          </a>
        ) : null}
      </h1>
      <StoreForm
        init={{
          store_name: s.store_name,
          bio: s.bio,
          city: s.city,
          return_policy: s.return_policy,
          shipping_fee: s.shipping_fee,
          free_shipping_over: s.free_shipping_over,
          processing_days: s.processing_days,
          logo: s.logo,
          banner: s.banner,
        }}
      />
    </>
  );
}
