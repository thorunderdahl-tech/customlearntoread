"use client";

import { usePathname } from "next/navigation";
import FooterSignup from "./FooterSignup";
import SiteHeader from "./SiteHeader";

// The store's header/footer should wrap every page EXCEPT the self-contained
// FitForge app at /fit, which provides its own full-screen chrome.
export default function StoreChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const standalone = pathname?.startsWith("/fit");

  if (standalone) {
    return <>{children}</>;
  }

  return (
    <>
      <SiteHeader />
      <main>{children}</main>
      <a className="mobile-cta button primary" href="/order">
        Create my book
      </a>
      <footer className="site-footer">
        <FooterSignup />
        <p>CustomLearnToRead &mdash; Personalized beginning-reader books.</p>
        <p className="fine-print">
          <a href="/privacy">Privacy</a> &middot; <a href="/terms">Terms</a> &middot;
          Privacy-first. Kid-centered. Built for early reading confidence.
        </p>
      </footer>
    </>
  );
}
