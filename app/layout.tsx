import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CustomLearnToRead | Personalized Beginning Reader Books",
  description:
    "Personalized learn-to-read books about your child, for your child, at their reading level.",
  openGraph: {
    title: "CustomLearnToRead",
    description:
      "Personalized learn-to-read books about your child, for your child, at their reading level.",
    type: "website",
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
          <p>CustomLearnToRead — Personalized beginning-reader books.</p>
          <p className="fine-print">
            <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a> ·
            Privacy-first. Kid-centered. Built for early reading confidence.
          </p>
        </footer>
      </body>
    </html>
  );
}
