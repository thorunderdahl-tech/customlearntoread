import type { MetadataRoute } from "next";
import { POPULAR_NAMES, nameToSlug } from "@/lib/names";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://customlearntoread-z3hs.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const namePages: MetadataRoute.Sitemap = POPULAR_NAMES.map((name) => ({
    url: `${siteUrl}/personalized-book-for/${nameToSlug(name)}`,
    lastModified: now,
    priority: 0.6,
    changeFrequency: "monthly",
  }));
  return [
    { url: `${siteUrl}/`, lastModified: now, priority: 1.0, changeFrequency: "weekly" },
    { url: `${siteUrl}/order`, lastModified: now, priority: 0.9, changeFrequency: "monthly" },
    { url: `${siteUrl}/personalized-book-for`, lastModified: now, priority: 0.8, changeFrequency: "monthly" },
    { url: `${siteUrl}/about`, lastModified: now, priority: 0.7, changeFrequency: "monthly" },
    { url: `${siteUrl}/privacy`, lastModified: now, priority: 0.3, changeFrequency: "yearly" },
    { url: `${siteUrl}/terms`, lastModified: now, priority: 0.3, changeFrequency: "yearly" },
    ...namePages,
  ];
}
