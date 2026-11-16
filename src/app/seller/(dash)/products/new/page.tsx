import { requireSeller } from "@/lib/sellerAuth";
import { getSettings } from "@/lib/settings";
import ProductForm from "@/components/seller/ProductForm";

export const metadata = { title: "Add a book" };

export default async function NewProduct() {
  const [, s] = await Promise.all([requireSeller(), getSettings()]);
  return (
    <>
      <h1 className="sl-h1">Add a book</h1>
      <ProductForm init={{}} maxPhotos={s.seller_max_images ?? 6} minPrice={s.seller_min_price ?? 100} maxPrice={s.seller_max_price ?? 25000} />
    </>
  );
}
