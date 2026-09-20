import type { MetadataRoute } from "next";
import { allCategories, recentItems } from "@/lib/queries";

const BASE = process.env.SITE_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPaths = ["", "/search", "/brands", "/guide", "/help", "/legal/terminos", "/legal/privacidad", "/legal/cookies", "/legal/prohibidos"];
  return [
    ...staticPaths.map((path) => ({ url: `${BASE}${path}`, changeFrequency: "daily" as const, priority: path === "" ? 1 : 0.6 })),
    ...allCategories().map((c) => ({ url: `${BASE}/category/${c.slug}`, changeFrequency: "daily" as const, priority: 0.7 })),
    ...recentItems(200).map((item) => ({
      url: `${BASE}/item/${item.id}`,
      lastModified: new Date(item.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
  ];
}
