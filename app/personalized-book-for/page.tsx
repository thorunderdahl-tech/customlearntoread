import type { Metadata } from "next";
import Link from "next/link";
import { POPULAR_NAMES, nameToSlug } from "@/lib/names";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://customlearntoread-z3hs.vercel.app";

export const metadata: Metadata = {
  title: "Personalized Books by Name | Custom Learn-to-Read Stories",
  description:
    "Find a personalized learn-to-read book for your child by name. Custom beginning-reader stories made with their name, look, and favorite things.",
  alternates: { canonical: `${siteUrl}/personalized-book-for` },
};

export default function PersonalizedBooksIndex() {
  const names = [...POPULAR_NAMES].sort((a, b) => a.localeCompare(b));
  return (
    <>
      <section className="center-narrow">
        <p className="eyebrow">Personalized beginning-reader books</p>
        <h1>A custom book for every little reader</h1>
        <p>
          Pick a name to see a personalized learn-to-read book made for them — or
          just{" "}
          <Link href="/order" style={{ borderBottom: "2px solid var(--peach)" }}>
            start your child&apos;s book
          </Link>{" "}
          with any name. Every story is written at your child&apos;s reading level,
          starring them by name and likeness.
        </p>
      </section>

      <section className="section muted">
        <div className="section-heading">
          <h2>Popular names</h2>
          <p>Don&apos;t see your child&apos;s name? Every name works — just start an order.</p>
        </div>
        <ul className="name-grid">
          {names.map((name) => (
            <li key={name}>
              <Link href={`/personalized-book-for/${nameToSlug(name)}`}>
                Book for {name}
              </Link>
            </li>
          ))}
        </ul>
        <div className="cta-row" style={{ justifyContent: "center", marginTop: 32 }}>
          <Link className="button primary" href="/order">
            Create my child&apos;s book
          </Link>
        </div>
      </section>
    </>
  );
}
