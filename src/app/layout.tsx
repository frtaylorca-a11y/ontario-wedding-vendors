import type { Metadata } from "next";
import { Cormorant_Garamond, Inter, Playfair_Display, Fraunces, Nunito, Great_Vibes } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AnalyticsLoaders } from "@/components/analytics/AnalyticsLoaders";
import { AttributionCapture } from "@/components/analytics/AttributionCapture";
import { CookieConsent } from "@/components/analytics/CookieConsent";
import { getSiteStats } from "@/lib/queries";
import "./globals.css";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const body = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

/* Wedding-website theme fonts — loaded once at the document root so any
 * subtree can reference them via `var(--font-playfair)` etc. */
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight:  ["400", "500", "600", "700"],
  style:   ["normal", "italic"],
  variable: "--font-playfair",
  display:  "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  weight:  ["400", "500", "600", "700"],
  style:   ["normal", "italic"],
  variable: "--font-fraunces",
  display:  "swap",
});

const nunito = Nunito({
  subsets: ["latin"],
  weight:  ["400", "500", "600", "700"],
  variable: "--font-nunito",
  display:  "swap",
});

/* Wedding-monogram script — used for couple initials in the hero. */
const greatVibes = Great_Vibes({
  subsets: ["latin"],
  weight:  "400",
  variable: "--font-monogram",
  display:  "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ontarioweddingvendors.com";

export async function generateMetadata(): Promise<Metadata> {
  const stats = await getSiteStats().catch(() => null);
  const venueLabel  = stats ? stats.venueCount.toLocaleString()  : "hundreds of";
  const vendorLabel = stats ? stats.vendorCount.toLocaleString() : "hundreds of";

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: "Ontario Wedding Venues & Vendors | Find Your Perfect Wedding Venue",
      template: "%s | Ontario Wedding Vendors",
    },
    description: `Browse ${venueLabel} verified Ontario wedding venues and ${vendorLabel} vendors. AI-powered planning tool matches vendors to your venue, budget and location. Niagara, Toronto, Muskoka and beyond.`,
    openGraph: {
      type: "website",
      url: siteUrl,
      siteName: "Ontario Wedding Vendors",
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${playfair.variable} ${fraunces.variable} ${nunito.variable} ${greatVibes.variable}`}>
      <body className="min-h-screen antialiased">
        <AnalyticsLoaders
          ga4Id={process.env.NEXT_PUBLIC_GA4_ID}
          metaPixelId={process.env.NEXT_PUBLIC_META_PIXEL_ID}
          clarityId={process.env.NEXT_PUBLIC_CLARITY_ID}
        />
        <AttributionCapture />
        <Header />
        {children}
        <Footer />
        <CookieConsent />
      </body>
    </html>
  );
}
