"use client";

import { useState } from "react";
import Link from "next/link";

const LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/#formats", label: "Formats" },
  { href: "/#subscription", label: "Book Club" },
  { href: "/about", label: "About" },
  { href: "/#faq", label: "FAQ" },
];

export default function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header">
      <Link className="logo" href="/" aria-label="CustomLearnToRead home" onClick={() => setOpen(false)}>
        <span className="logo-mark" aria-hidden="true">
          <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 8 L15 6.5 L15 25.5 L4 27 Z" fill="currentColor" opacity="0.92" />
            <path d="M28 8 L17 6.5 L17 25.5 L28 27 Z" fill="currentColor" opacity="0.62" />
            <path d="M20.5 3.5 l1 2.6 l2.6 1 l-2.6 1 l-1 2.6 l-1-2.6 l-2.6-1 l2.6-1 Z" fill="#f7d58b" />
          </svg>
        </span>
        <span>CustomLearnToRead</span>
      </Link>

      <button
        className="nav-toggle"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? "✕" : "☰"}
      </button>

      <nav className={`site-nav${open ? " open" : ""}`}>
        {LINKS.map((l) => (
          <a key={l.href} href={l.href} onClick={() => setOpen(false)}>
            {l.label}
          </a>
        ))}
        <Link className="button primary nav-cta" href="/order" onClick={() => setOpen(false)}>
          Create my book
        </Link>
      </nav>
    </header>
  );
}
