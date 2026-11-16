import { permanentRedirect } from "next/navigation";

/** The reader no longer saves pages (Google's viewer cannot tell us the page), so this page is gone. */
export default function SavedPage() {
  permanentRedirect("/");
}
