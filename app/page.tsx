import Link from "next/link";
import Image from "next/image";
import { PRODUCTS, productById } from "@/lib/products";

const productSchema = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "Personalized Learn-to-Read Books",
  description:
    "Personalized learn-to-read books featuring your child by name and likeness. Made for beginning readers.",
  brand: { "@type": "Brand", name: "CustomLearnToRead" },
  offers: PRODUCTS.map((p) => ({
    "@type": "Offer",
    name: p.name,
    priceCurrency: "USD",
    price: (p.priceCents / 100).toFixed(2),
    availability: "https://schema.org/InStock",
  })),
};

export default function Home() {
  const sub = PRODUCTS.find((p) => p.cadence === "monthly")!;
  const single = productById("paperback_single")!;
  const featuredOneTime = [
    productById("digital")!,
    productById("paperback_set")!,
    productById("hardcover_set")!,
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">Personalized books for beginning readers</p>
          <h1>Get early readers excited about books.</h1>
          <p className="subhead">
            Personalized learn-to-read books your child will actually want to
            read &mdash; made with their name, their look, and the things they
            love.
          </p>
          <div className="cta-row">
            <Link className="button primary" href="/order">
              Create my book
            </Link>
            <a className="button secondary" href="#how">
              See how it works
            </a>
          </div>
        </div>

        <div className="hero-books-wrap">
          <div className="hero-books" aria-label="Sample personalized book covers">
            <Image
              className="hero-book hero-book-1"
              src="/mia.png"
              width={1009}
              height={1559}
              alt="Sample personalized book: Mia Plays Soccer (Reading Level 1)"
              priority
            />
            <Image
              className="hero-book hero-book-2"
              src="/Odin.png"
              width={1009}
              height={1559}
              alt="Sample personalized book: Odin and His Best Dog (Reading Level 2)"
              priority
            />
            <Image
              className="hero-book hero-book-3"
              src="/Sam.png"
              width={1009}
              height={1559}
              alt="Sample personalized book: Sam Can Read (Reading Level 3)"
              priority
            />
          </div>
          <p className="books-caption">
            Big text. Simple words. Their favorite thing.
          </p>
        </div>
      </section>

      <section className="promise">
        <p className="eyebrow">More than a name on the cover</p>
        <h2>About them. For them. At their reading level.</h2>
        <p>
          Most personalized books just swap in your child&apos;s name. We build
          the whole story around what they love &mdash; their best friend,
          their dog, their soccer jersey number, the things only they care
          about &mdash; and write it at the level they&apos;re ready for.
        </p>
      </section>

      <section id="how" className="section">
        <div className="section-heading">
          <p className="eyebrow">How it works</p>
          <h2>Three simple steps</h2>
        </div>
        <div className="steps-grid">
          <article className="step-card">
            <div className="step-icon" aria-hidden="true">
              <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 26 L6 6 L20 6 L26 12 L26 26 Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                <path d="M20 6 L20 12 L26 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                <line x1="11" y1="17" x2="21" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <line x1="11" y1="21" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <h3>Tell us about your reader</h3>
            <p>
              Name, appearance, reading level, favorite themes, and any details
              that matter.
            </p>
          </article>
          <article className="step-card">
            <div className="step-icon" aria-hidden="true">
              <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 4 L18 12 L26 14 L18 16 L16 24 L14 16 L6 14 L14 12 Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                <circle cx="24" cy="6" r="1.5" fill="currentColor"/>
                <circle cx="6" cy="22" r="1.5" fill="currentColor"/>
                <circle cx="26" cy="24" r="1" fill="currentColor"/>
              </svg>
            </div>
            <h3>We write a story they&apos;ll love</h3>
            <p>The words stay simple. The pictures carry the magic.</p>
          </article>
          <article className="step-card">
            <div className="step-icon" aria-hidden="true">
              <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 8 L16 6 L28 8 L28 26 L16 24 L4 26 Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                <line x1="16" y1="6" x2="16" y2="24" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
            <h3>They read a book made for them</h3>
            <p>
              A confidence-building book they will want to read again and
              again.
            </p>
          </article>
        </div>
      </section>

      <section id="formats" className="section muted">
        <div className="section-heading">
          <p className="eyebrow">Book options</p>
          <h2>Choose the format that works for your family</h2>
          <p className="shipping-banner">
            <span aria-hidden="true">&#10004;</span> Free US shipping on every paperback &amp; hardcover order
          </p>
        </div>
        <div className="pricing-grid-3">
          {featuredOneTime.map((p) => (
            <article
              key={p.id}
              className={`price-card${p.popular ? " popular" : ""}${p.bestValue ? " best-value" : ""}`}
            >
              {p.popular && <p className="badge">Most popular</p>}
              {p.bestValue && <p className="badge badge-gold">Best value</p>}
              <h3>{p.name}</h3>
              <p className="price">{p.priceLabel}</p>
              {p.perBookLabel && <p className="per-book">{p.perBookLabel}</p>}
              <p>{p.blurb}</p>
            </article>
          ))}
        </div>
        <p className="single-link">
          Just want to try one book?{" "}
          <Link href="/order">
            <strong>Single paperback &mdash; {single.priceLabel}</strong>
          </Link>
        </p>
        <div style={{ textAlign: "center", marginTop: 28 }}>
          <Link className="button primary" href="/order">
            Start a one-time order
          </Link>
        </div>
      </section>

      <section id="subscription" className="section">
        <div className="subscription-card">
          <div>
            <p className="eyebrow">Monthly Book Club</p>
            <h2>A new personalized book every month.</h2>
            <p style={{ color: "var(--ink)", fontWeight: 600 }}>
              Each month, your child gets a brand-new paperback book starring
              themselves &mdash; new themes, new adventures, same simple words
              that build confidence.
            </p>
            <ul>
              <li>1 new personalized paperback per month</li>
              <li>Themes refresh &mdash; reading level grows with them</li>
              <li>Free shipping in the US</li>
              <li>Pause or cancel any time</li>
            </ul>
          </div>
          <div className="price-tag">
            <p className="big-price">{sub.priceLabel}</p>
            <p className="per">billed monthly</p>
            <p className="per-book" style={{ marginBottom: 14 }}>{sub.perBookLabel}</p>
            <Link className="button primary" href="/order?plan=subscription_monthly">
              Start the book club
            </Link>
          </div>
        </div>
      </section>

      <section className="section reading-levels muted">
        <div className="section-heading">
          <p className="eyebrow">Reading level approach</p>
          <h2>Built for confidence first</h2>
          <p>Pick the level that matches your reader &mdash; or pick easier. Confidence comes before challenge.</p>
        </div>
        <div className="levels-grid">
          <article className="level-card">
            <p className="level-tag">Level 1</p>
            <h3>Brand-new reader</h3>
            <p className="sample">&ldquo;Sam can run.&rdquo;</p>
            <p>One short sentence per page. Big text. Lots of repetition.</p>
          </article>
          <article className="level-card">
            <p className="level-tag">Level 2</p>
            <h3>Very early reader</h3>
            <p className="sample">&ldquo;Sam runs to the ball.&rdquo;</p>
            <p>Simple action words. Predictable patterns. Confidence-building.</p>
          </article>
          <article className="level-card">
            <p className="level-tag">Level 3</p>
            <h3>Growing reader</h3>
            <p className="sample">&ldquo;Sam sees the big red ball.&rdquo;</p>
            <p>More story progression. More descriptive words. Still decodable.</p>
          </article>
          <article className="level-card">
            <p className="level-tag">Level 4</p>
            <h3>Confident early reader</h3>
            <p className="sample">&ldquo;Sam kicks the ball down the hill and laughs.&rdquo;</p>
            <p>Short paragraphs. Wider vocabulary. More expressive story.</p>
          </article>
        </div>
      </section>

      <section className="section testimonials">
        <div className="section-heading">
          <p className="eyebrow">Loved by parents</p>
          <h2>What families are saying</h2>
        </div>
        <figure className="featured-quote">
          <p className="quote-mark" aria-hidden="true">&ldquo;</p>
          <blockquote>
            She loves it. They&apos;re amazing. Thank you!!!
          </blockquote>
          <figcaption>
            &mdash; A dad in Minnesota, on his daughter&apos;s custom book
          </figcaption>
        </figure>
      </section>

      <section className="section guarantee muted">
        <div className="guarantee-card">
          <h3>Not in love with your book? We&apos;ll make it right.</h3>
          <p>
            Every book is custom-made, so if something&apos;s off &mdash; a
            name spelled wrong, a theme that didn&apos;t land, art that
            doesn&apos;t feel right &mdash; just reply to your order email.
            We&apos;ll redo it for free or refund you. We want kids excited
            about reading, not stuck with a book that doesn&apos;t feel right.
          </p>
        </div>
      </section>

      <section id="faq" className="section">
        <div className="section-heading">
          <p className="eyebrow">FAQ</p>
          <h2>Common questions</h2>
        </div>
        <div className="faq-list">
          <details>
            <summary>Can I include a favorite sport, pet, or stuffed animal?</summary>
            <p>
              Yes. Favorite activities, pets, stuffed animals, family members,
              colors, and numbers are exactly what make the book exciting.
            </p>
          </details>
          <details>
            <summary>What makes this different from other personalized books?</summary>
            <p>
              Most personalized books just insert your child&apos;s name into a
              generic story. We build the whole story around what your child
              actually loves &mdash; their dog, their grandpa, their soccer
              jersey number &mdash; and write it at the reading level
              they&apos;re ready for. Big text, simple words, a hero they
              recognize as themselves.
            </p>
          </details>
          <details>
            <summary>What&apos;s the print quality?</summary>
            <p>
              Our paperbacks are professionally printed on thick matte paper
              with full-color illustrations. Hardcover sets use heavier stock
              and a sewn binding so they&apos;ll survive lots of re-reads.
            </p>
          </details>
          <details>
            <summary>Can you use licensed characters?</summary>
            <p>
              No. We avoid trademarked characters, logos, and copyrighted
              worlds. We can create an original story inspired by a child&apos;s
              interests.
            </p>
          </details>
          <details>
            <summary>How does the monthly book club work?</summary>
            <p>
              Each month we ship a new personalized paperback book featuring
              your child. You&apos;re billed monthly and can pause or cancel any
              time from your receipt email.
            </p>
          </details>
          <details>
            <summary>What if I don&apos;t know the reading level?</summary>
            <p>
              When in doubt, choose the easier level. Confidence matters most
              for a brand-new reader.
            </p>
          </details>
          <details>
            <summary>How long until I get my book?</summary>
            <p>
              Most one-time paperback and hardcover orders ship within 7-10
              business days. Digital PDFs are emailed within 5 business days.
            </p>
          </details>
          <details>
            <summary>What if we don&apos;t love it?</summary>
            <p>
              Tell us what to fix and we&apos;ll redo the book for free, or
              refund you. We want kids excited about reading &mdash; not stuck
              with a book that doesn&apos;t feel right.
            </p>
          </details>
        </div>
      </section>
    </>
  );
}
