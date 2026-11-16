import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Same URL structure as the PHP site: /novel-slug/, /about/, /categories/
  trailingSlash: true,
  poweredByHeader: false,
  compress: true,
  // Native / Node-only modules stay out of the bundle
  serverExternalPackages: ["sharp", "mongodb"],
  images: { unoptimized: true },
  experimental: {
    serverActions: { bodySizeLimit: "60mb" },
    // CSS goes inside the HTML: no extra round trips before the first paint (slow mobile networks)
    inlineCss: false,
  },
  async headers() {
    const security = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      // Frames may only show Google (the novel reader) and video embeds. A link inside a
      // novel PDF therefore cannot open another website inside our reader.
      {
        key: "Content-Security-Policy",
        value:
          "frame-src 'self' https://drive.google.com https://docs.google.com https://accounts.google.com https://www.youtube.com https://www.youtube-nocookie.com https://www.facebook.com https://www.tiktok.com https://www.instagram.com https://*.doubleclick.net https://*.googlesyndication.com",
      },
    ];
    return [
      { source: "/:path*", headers: security },
      // the community is for members, never for search engines
      { source: "/community/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      { source: "/community", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
};

export default nextConfig;
