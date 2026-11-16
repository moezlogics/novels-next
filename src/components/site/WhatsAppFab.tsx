/** WhatsApp logo from the site's icon set (no extra download). */
export function WhatsAppGlyph({ className = "" }: { className?: string }) {
  return <i className={`fa-brands fa-whatsapp ${className}`} aria-hidden="true"></i>;
}

/**
 * Floating "Join Channel" button (bottom right on every public page): the WhatsApp
 * logo in a green circle, with "JOIN CHANNEL" turning slowly around it.
 * Pure HTML/CSS — no JavaScript, so it never slows the page.
 */
export default function WhatsAppFab({ url }: { url: string }) {
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener" className="kn-wa-fab" aria-label="Join our WhatsApp Channel">
      <svg className="kn-wa-ring" viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <path id="kn-wa-circle" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" />
        </defs>
        <text>
          <textPath href="#kn-wa-circle" textLength="236" lengthAdjust="spacing">
            JOIN CHANNEL • JOIN CHANNEL •
          </textPath>
        </text>
      </svg>
      <span className="kn-wa-dot">
        <WhatsAppGlyph />
      </span>
    </a>
  );
}
