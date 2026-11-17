/** WhatsApp logo from the site's icon set (no extra download). */
export function WhatsAppGlyph({ className = "" }: { className?: string }) {
  return <i className={`fa-brands fa-whatsapp ${className}`} aria-hidden="true"></i>;
}

/**
 * Floating "Join Channel" button (bottom right on every public page): the WhatsApp
 * logo in a green circle, with "JOIN CHANNEL" written in a curve over it (it does not move).
 * Pure HTML/CSS — no JavaScript, so it never slows the page.
 */
export default function WhatsAppFab({ url }: { url: string }) {
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener" className="kn-wa-fab" aria-label="Join our WhatsApp Channel">
      <svg className="kn-wa-ring" viewBox="0 0 120 120" aria-hidden="true">
        <defs>
          {/* full circle, starting at the bottom and going up the left side */}
          <path id="kn-wa-arc" d="M60,103 A43,43 0 1,1 60.01,103" />
        </defs>
        <text textAnchor="middle">
          <textPath href="#kn-wa-arc" startOffset="50%">
            JOIN CHANNEL
          </textPath>
        </text>
      </svg>
      <span className="kn-wa-dot">
        <WhatsAppGlyph />
      </span>
    </a>
  );
}
