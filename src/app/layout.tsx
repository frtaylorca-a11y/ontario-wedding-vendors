import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
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
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="min-h-screen antialiased">
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
