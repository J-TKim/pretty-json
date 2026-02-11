import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = "https://pretty-json-viewer.vercel.app";

export const metadata: Metadata = {
  title: "Pretty JSON - Online JSON Formatter, Viewer & Beautifier",
  description:
    "Free online JSON formatter, viewer, and beautifier. Prettify, minify, and validate your JSON data instantly with an interactive data explorer. No sign-up required.",
  keywords: [
    "JSON formatter",
    "JSON viewer",
    "JSON beautifier",
    "JSON prettifier",
    "JSON minifier",
    "JSON validator",
    "online JSON tool",
    "pretty print JSON",
    "format JSON online",
    "JSON editor",
    "JSON parser",
    "JSON data explorer",
  ],
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Pretty JSON - Online JSON Formatter, Viewer & Beautifier",
    description:
      "Free online JSON formatter, viewer, and beautifier. Prettify, minify, and validate your JSON data instantly with an interactive data explorer.",
    url: siteUrl,
    siteName: "Pretty JSON",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pretty JSON - Online JSON Formatter & Viewer",
    description:
      "Free online JSON formatter, viewer, and beautifier. Prettify, minify, and validate your JSON data instantly.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Pretty JSON",
    url: siteUrl,
    description:
      "Free online JSON formatter, viewer, and beautifier. Prettify, minify, and validate your JSON data instantly.",
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Any",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    featureList: [
      "JSON formatting and prettifying",
      "JSON minification",
      "Interactive data explorer",
      "Syntax highlighting",
      "Path navigation",
      "Configurable indentation",
    ],
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
