import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://customlearntoread-z3hs.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    template: "%s | CustomLearnToRead",
    default: "CustomLearnToRead | Personalized Beginning Reader Books",
  },
  description:
    "Personalized learn-to-read books about your child, for your child, at their reading level.",
  openGraph: {
    title: "CustomLearnToRead",
    description:
      "Personalized learn-to-read books about your child, for your child, at their reading level.",
    type: "website",
    url: siteUrl,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "CustomLearnToRead sample book covers" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "CustomLearnToRead",
    description:
      "Personalized learn-to-read books about your child, for your child, at their reading level.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <a className="logo" href="/">
            CustomLearnToRead
          </a>
          <nav>
            <a href="/#how">How it works</a>
            <a href="/#formats">Formats</a>
            <a href="/#subscription">Book Club</a>
            <a href="/order">Order</a>
            <a href="/#faq">FAQ</a>
          </nav>
        </header>
        <main>{children}</main>
        <footer className="site-footer">
          <p>CustomLearnToRead - Personalized beginning-reader books.</p>
          <p className="fine-print">
            <a href="/privacy">Privacy</a> &middot; <a href="/terms">Terms</a> &middot;
            Privacy-first. Kid-centered. Built for early reading confidence.
          </p>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
