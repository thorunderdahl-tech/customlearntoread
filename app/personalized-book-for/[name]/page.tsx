import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PRODUCTS } from "@/lib/products";
import { POPULAR_NAMES, nameToSlug, slugToDisplayName } from "@/lib/names";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://customlearntoread-z3hs.vercel.app";

// Pre-render the popular names at build time; any other name renders on demand.
export function generateStaticParams() {
  return POPULAR_NAMES.map((n) => ({ name: nameToSlug(n) }));
}
export const dynamicParams = true;
export const revalidate = 86400; // re-cache once a day

function displayNameFromParam(param: string): string {
  return slugToDisplayName(decodeURIComponent(param || ""));
}

export function generateMetadata({ params }: { params: { name: string } }): Metadata {
  const name = displayNameFromParam(params.name);
  if (!name) return { title: "Personalized Beginning Reader Books" };
  const title = `Personalized Book for ${name} | A Custom Learn-to-Read Story`;
  const description = `Make a personalized learn-to-read book starring ${name} — written at their reading level, with their name, their look, and the things ${name} loves. Free US shipping.`;
  const url = `${siteUrl}/personalized-book-for/${nameToSlug(name)}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website", images: [{ url: "/og-image.png", width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: ["/og-image.png"] },
  };
}

export default function PersonalizedBookForName({ params }: { params: { name: string } }) {
  const name = displayNameFromParam(params.name);
  if (!name) notFound();

  const orderHref = `/order?child=${encodeURIComponent(name)}`;
  const fromPrice = Math.min(...PRODUCTS.map((p) => p.priceCents)) / 100;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `Personalized Learn-to-Read Book for ${name}`,
    description: `A custom beginning-reader book starring ${name}, written at their reading level with their name, look, and favorite things.`,
    brand: { "@type": "Brand", name: "CustomLearnToRead" },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: fromPrice.toFixed(2),
      highPrice: (Math.max(...PRODUCTS.map((p) => p.priceCents)) / 100).toFixed(2),
      availability: "https://schema.org/InStock",
    },
  };

  const faq = [
    {
      q: `Is the book really personalized for ${name}?`,
      a: `Yes. ${name} is the main character by name and likeness — we draw their hair, eyes, skin tone, glasses, and favorite outfit, and build the whole story around the things ${name} loves.`,
    },
    {
      q: `What reading level will ${name}'s book be?`,
      a: `You pick the level when you order, from Level 1 (Tiny Reader, brand-new) to Level 4 (Confident Reader). We write ${name}'s story to match, with big text, simple words, and lots of repetition for early readers.`,
    },
    {
      q: `How fast can I get it?`,
      a: `Digital PDFs are emailed within 5 business days. Printed books typically ship within 7–10 business days, with free US shipping. Need it sooner? Rush production is offered right after you order.`,
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">Personalized beginning-reader book</p>
          <h1>A book where {name} is the hero.</h1>
          <p className="subhead">
            Give {name} a learn-to-read book they&apos;ll actually want to read —
            made with their name, their look, and the things {name} loves, and
            written at the reading level they&apos;re ready for.
          </p>
          <div className="cta-row">
            <Link className="button primary" href={orderHref}>
              Create {name}&apos;s book
            </Link>
            <Link className="button secondary" href="/#how">
              See how it works
            </Link>
          </div>
          <ul className="hero-trust" aria-label="Why families love us">
            <li><span aria-hidden="true">&#10084;</span> Loved by families</li>
            <li><span aria-hidden="true">&#128230;</span> Free US shipping</li>
            <li><span aria-hidden="true">&#8617;</span> Love-it guarantee</li>
          </ul>
          <p style={{ marginTop: 14, fontWeight: 700 }}>From ${fromPrice.toFixed(0)} · digital, paperback &amp; hardcover</p>
        </div>
      </section>

      <ul className="cred-row" aria-label="What makes us different">
        <li><span aria-hidden="true">&#10022;</span> {name} by name &amp; likeness</li>
        <li><span aria-hidden="true">&#10022;</span> Original story &amp; art</li>
        <li><span aria-hidden="true">&#10022;</span> Written at {name}&apos;s level</li>
        <li><span aria-hidden="true">&#10022;</span> Privacy-first with kids&apos; details</li>
      </ul>

      <section className="promise">
        <p className="eyebrow">More than a name on the cover</p>
        <h2>Made about {name}. For {name}. At their reading level.</h2>
        <p>
          Most &quot;personalized&quot; books just swap in a name. We build {name}&apos;s
          whole story around what they love — their best friend, their dog, the
          soccer number on their jersey, the things only {name} cares about — and
          write it at the level they&apos;re ready for. Kids read more when the hero
          is them.
        </p>
        <div className="cta-row" style={{ justifyContent: "center", marginTop: 22 }}>
          <Link className="button primary" href={orderHref}>
            Start {name}&apos;s book &rarr;
          </Link>
        </div>
      </section>

      <section className="section muted">
        <div className="section-heading">
          <p className="eyebrow">Questions</p>
          <h2>Making {name}&apos;s book</h2>
        </div>
        <div className="faq-list">
          {faq.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
        <div className="cta-row" style={{ justifyContent: "center", marginTop: 28 }}>
          <Link className="button primary" href={orderHref}>
            Create {name}&apos;s book
          </Link>
        </div>
      </section>
    </>
  );
}
