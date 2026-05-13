import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  // VERCEL_ENV is set automatically by Vercel: "production" | "preview" | "development"
  // Locally it is undefined, which also triggers the non-production branch.
  const isProduction = process.env.VERCEL_ENV === "production";

  if (!isProduction) {
    return {
      rules: { userAgent: "*", disallow: "/" },
      sitemap: "https://www.farmaplushuacas.com/sitemap.xml",
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/*/cart", "/*/search", "/*/checkout", "/*/account"],
      },
    ],
    sitemap: "https://www.farmaplushuacas.com/sitemap.xml",
  };
}
