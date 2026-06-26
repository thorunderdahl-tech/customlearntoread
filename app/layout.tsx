import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import StoreChrome from "./components/StoreChrome";
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
    "Personalized learn-to-read books your child will actually want to read - more than a name swap, a full story made around what they love.",
  openGraph: {
    title: "CustomLearnToRead",
    description:
      "Personalized learn-to-read books your child will actually want to read - more than a name swap.",
    type: "website",
    url: siteUrl,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "CustomLearnToRead sample book covers" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "CustomLearnToRead",
    description:
      "Personalized learn-to-read books your child will actually want to read.",
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
        <StoreChrome>{children}</StoreChrome>
        <Analytics />
      </body>
    </html>
  );
}
