import { CartView, ShopNav } from "@/components/shop/ShopUI";

export const metadata = { title: { absolute: "Your Cart" }, robots: "noindex, nofollow" };

export default function CartPage() {
  return (
    <>
      <ShopNav title="Shopping Cart" back="/shop/" />
      <div className="shop-container">
        <CartView />
      </div>
    </>
  );
}
