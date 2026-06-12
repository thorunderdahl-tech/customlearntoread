import type { MetadataRoute } from "next";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://customlearntoread-z3hs.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/order/success", "/order/cancel", "/books/", "/admin/", "/interview"] }],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
