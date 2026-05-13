import type { MetadataRoute } from "next";

const BASE_URL = "https://www.farmaplushuacas.com";

// Locale-agnostic path segments that exist in both /es and /en.
// Add entries here as new translated pages are built.
const staticPaths: { es: string; en: string; priority: number }[] = [
  { es: "", en: "", priority: 1.0 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return staticPaths.flatMap(({ es, en, priority }) => [
    {
      url: `${BASE_URL}/es${es}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority,
      alternates: {
        languages: {
          es: `${BASE_URL}/es${es}`,
          en: `${BASE_URL}/en${en}`,
          "x-default": `${BASE_URL}/es${es}`,
        },
      },
    },
    {
      url: `${BASE_URL}/en${en}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: Math.max(priority - 0.1, 0.1),
      alternates: {
        languages: {
          es: `${BASE_URL}/es${es}`,
          en: `${BASE_URL}/en${en}`,
          "x-default": `${BASE_URL}/es${es}`,
        },
      },
    },
  ]);
}
