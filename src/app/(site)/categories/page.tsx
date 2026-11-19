import { permanentRedirect } from "next/navigation";

// The old "All Urdu Novels Categories" page. Every category is in the homepage
// carousel (and the phone tab bar), so the address moves there for good.
export default function CategoriesPage() {
  permanentRedirect("/");
}
