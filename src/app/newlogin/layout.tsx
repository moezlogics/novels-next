import "@/styles/icons.css";
import "@/styles/admin.css";
import type { ReactNode } from "react";

export const metadata = { title: { default: "Admin Panel", template: "%s · Admin" }, robots: "noindex, nofollow" };

export default function AdminRoot({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
