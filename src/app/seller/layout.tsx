import "@/styles/icons.css";
import "@/styles/seller.css";
import type { ReactNode } from "react";
import type { Viewport } from "next";

export const metadata = { title: { default: "Seller Center", template: "%s · Seller Center" }, robots: "noindex, nofollow" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0e7490" };

export default function SellerRoot({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="sl-body">
        <div className="sl">{children}</div>
      </body>
    </html>
  );
}
