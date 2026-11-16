import "@/styles/coming_soon.css";
import Link from "next/link";

export default function ComingSoon({ title, headline, subtitle, siteName }: { title: string; headline: string; subtitle: string; siteName: string }) {
  return (
    <div className="cs">
      <div className="cs-panel">
        <div className="cs-accent" aria-hidden="true"></div>
        <p className="cs-section">{title}</p>
        <h1>{headline}</h1>
        <p className="cs-desc">{subtitle}</p>
        <Link href="/" className="cs-btn">
          <i className="fa-solid fa-arrow-left"></i> Back to {siteName}
        </Link>
      </div>
    </div>
  );
}
