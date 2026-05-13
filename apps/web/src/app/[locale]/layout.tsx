import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import "../globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const BASE_URL = "https://www.farmaplushuacas.com";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  const canonical = `${BASE_URL}/${locale}`;

  return {
    metadataBase: new URL(BASE_URL),
    title: {
      default: t("title"),
      template: t("titleTemplate"),
    },
    description: t("description"),
    alternates: {
      canonical,
      // Use bare locale codes ("es", "en") to match next-intl middleware's
      // auto-generated Link response headers and avoid conflicting signals.
      languages: {
        es: `${BASE_URL}/es`,
        en: `${BASE_URL}/en`,
        "x-default": `${BASE_URL}/es`,
      },
    },
    icons: {
      icon: "/FarmaPlus-logo.svg",
      apple: "/FarmaPlus-logo.png",
    },
    openGraph: {
      type: "website",
      locale: locale === "es" ? "es_CR" : "en_US",
      url: canonical,
      siteName: "FarmaPlus Huacas",
      title: t("title"),
      description: t("description"),
      images: [
        {
          url: "/farmaplus-og.png",
          width: 1200,
          height: 630,
          alt: "FarmaPlus Huacas",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
      images: ["/farmaplus-og.png"],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true },
    },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const t = await getTranslations({ locale, namespace: "metadata" });
  const inLanguage = locale === "es" ? "es-CR" : "en";
  const canonical = `${BASE_URL}/${locale}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["Organization", "Pharmacy", "LocalBusiness"],
        "@id": `${BASE_URL}/#organization`,
        name: "FarmaPlus Huacas",
        url: BASE_URL,
        logo: `${BASE_URL}/FarmaPlus-logo.png`,
        telephone: "+50687235555",
        address: {
          "@type": "PostalAddress",
          streetAddress: "El Cruce",
          addressLocality: "Huacas",
          addressRegion: "Guanacaste",
          addressCountry: "CR",
        },
        geo: {
          "@type": "GeoCoordinates",
          latitude: 10.4344,
          longitude: -85.8274,
        },
        sameAs: ["https://www.instagram.com/farmaplus.huacas/"],
        openingHoursSpecification: [
          {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: [
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
              "Sunday",
            ],
            opens: "00:00",
            closes: "23:59",
          },
        ],
        contactPoint: {
          "@type": "ContactPoint",
          telephone: "+50687235555",
          contactType: "customer service",
          availableLanguage: ["Spanish", "English"],
        },
      },
      {
        "@type": "WebSite",
        "@id": `${BASE_URL}/#website`,
        url: BASE_URL,
        name: "FarmaPlus Huacas",
        publisher: { "@id": `${BASE_URL}/#organization` },
        inLanguage: ["es-CR", "en"],
      },
      {
        "@type": "WebPage",
        "@id": `${canonical}#webpage`,
        url: canonical,
        name: t("title"),
        description: t("description"),
        isPartOf: { "@id": `${BASE_URL}/#website` },
        publisher: { "@id": `${BASE_URL}/#organization` },
        inLanguage,
      },
    ],
  };

  return (
    <html lang={inLanguage}>
      <body className={`${inter.variable} min-h-screen font-sans antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
