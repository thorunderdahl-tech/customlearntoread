import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Panel Prep",
  description: "Private interview practice.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
