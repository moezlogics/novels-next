import { notFound } from "next/navigation";

// Any deeper unknown path → site 404 (inside the normal header/footer)
export default function Rest() {
  notFound();
}
