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
  const sub = PRODUCTS.find((p) => p.cadence === "quarterly")!;
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
          <p className="eyebrow">Personalized books, built on the science of reading</p>
          <h1>A book that stars your child &mdash; and teaches them to read.</h1>
          <p className="subhead">
            Most personalized books just put your child&apos;s name in the story.
            Ours does that too &mdash; their name, their look, the things they love
            &mdash; and it&apos;s built to actually teach reading, with every word
            decodable at their level.
          </p>
          <div className="cta-row">
            <Link className="button primary" href="/order">
              Create my book
            </Link>
            <a className="button secondary" href="#how">
              See how it works
            </a>
          </div>
          <ul className="hero-trust" aria-label="Why families love us">
            <li><span aria-hidden="true">&#10084;</span> Loved by families</li>
            <li><span aria-hidden="true">&#128230;</span> Free US shipping</li>
            <li><span aria-hidden="true">&#8617;</span> Love-it guarantee</li>
          </ul>
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

      <ul className="cred-row" aria-label="What makes us different">
        <li><span aria-hidden="true">&#10022;</span> Family-run in Minnesota</li>
        <li><span aria-hidden="true">&#10022;</span> Original stories &amp; art</li>
        <li><span aria-hidden="true">&#10022;</span> Built for confidence first</li>
        <li><span aria-hidden="true">&#10022;</span> Privacy-first with kids&apos; details</li>
      </ul>

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

      <section className="section origin-teaser muted">
        <div className="origin-teaser-card">
          <p className="eyebrow">Why we made this</p>
          <p className="teaser-body">
            We built this because our son needed a book he actually wanted to
            read. We turned it into a business so other kids could feel the
            same way about a story.
          </p>
          <Link className="button secondary" href="/about">
            Read our story &rarr;
          </Link>
        </div>
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
              {p.gift && <p className="gift-line"><span aria-hidden="true">&#127873;</span> {p.gift}</p>}
              <p>{p.blurb}</p>
              {p.includes && (
                <ul className="includes-list">
                  {p.includes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
              <Link className={`button ${p.popular ? "primary" : "secondary"} card-cta`} href="/order">
                Create my book
              </Link>
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
            Create my book
          </Link>
        </div>
      </section>

      <section id="subscription" className="section">
        <div className="subscription-card">
          <div>
            <p className="eyebrow">Quarterly Reading Club</p>
            <h2>Three new books every season &mdash; always at your child&apos;s level.</h2>
            <p style={{ color: "var(--ink)", fontWeight: 600 }}>
              Before each shipment, we check in on how the reading is going and
              build the next set around your actual child &mdash; the right level
              for where they are today, and fresh topics for whatever they&apos;re
              obsessed with this season. (Kids contain multitudes: today&apos;s
              devoted mac &apos;n&apos; cheese loyalist is tomorrow&apos;s sworn
              noodle skeptic. We roll with it.) The books grow with your reader
              &mdash; not on a fixed schedule.
            </p>
            <ul>
              <li>3 personalized paperbacks each season &mdash; 12 books a year</li>
              <li>We check your child&apos;s reading level before every set</li>
              <li>Fresh topics each season &mdash; new favorite things, new adventures</li>
              <li>Free shipping in the US &middot; cancel any time</li>
            </ul>
          </div>
          <div className="price-tag">
            <p className="big-price">{sub.priceLabel}</p>
            <p className="per">first season $89, then billed every season</p>
            <p className="per-book" style={{ marginBottom: 14 }}>{sub.perBookLabel}</p>
            <Link className="button primary" href="/order?plan=subscription_quarterly">
              Start the reading club
            </Link>
          </div>
        </div>
      </section>

      <section className="section reading-levels muted">
        <div className="section-heading">
          <p className="eyebrow">Reading level approach</p>
          <h2>Built for confidence first</h2>
          <p>Pick the level that matches your reader &mdash; or pick easier. Confidence comes before challenge.</p>
          <p style={{ fontSize: "0.95rem" }}>
            Every level is built on a structured, systematic phonics
            scope-and-sequence &mdash; decodable text, not picture-guessing.{" "}
            <Link href="/reading-approach">See how we choose every word &rarr;</Link>
          </p>
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
        <div style={{ maxWidth: 720, margin: "32px auto 0", textAlign: "center" }}>
          <p className="eyebrow">Optional</p>
          <h3 style={{ margin: "0 0 8px" }}>Parent Read-Along Lines</h3>
          <p style={{ margin: "0 auto", maxWidth: 620 }}>
            Want to build vocabulary while they learn to sound out words? Add an
            optional grown-up read-aloud line to every page &mdash; richer language
            for you to read together, while your child reads their own simple line.
            Choose it when you order.{" "}
            <Link href="/reading-approach">How it works &rarr;</Link>
          </p>
        </div>
      </section>

      <section className="section peek-inside">
        <div className="section-heading">
          <p className="eyebrow">Peek inside</p>
          <h2>Real pages from real books.</h2>
          <p>Big text. Simple words. A hero they recognize as themselves.</p>
        </div>
        <div className="peek-grid">
          <Image
            className="peek-page"
            src="/emma-sample-1.jpg"
            width={1000}
            height={1544}
            alt="Sample interior page from Emma's personalized book"
          />
          <Image
            className="peek-page"
            src="/emma-sample-2.jpg"
            width={1000}
            height={1544}
            alt="Sample interior page from Emma's personalized book"
          />
          <Image
            className="peek-page"
            src="/emma-sample-3.jpg"
            width={1000}
            height={1544}
            alt="Sample interior page from Emma's personalized book"
          />
          <Image
            className="peek-page"
            src="/odin-sample.jpg"
            width={1000}
            height={1547}
            alt="Sample interior page from Odin's personalized book"
          />
        </div>
        <div style={{ textAlign: "center", marginTop: 32 }}>
          <Link className="button primary" href="/order">
            Create my book
          </Link>
          <p className="cta-microcopy">
            Takes about 3 minutes &middot; Preview before it ships &middot; Love-it guarantee
          </p>
        </div>
      </section>


      <section className="section testimonials">
        <div className="section-heading">
          <p className="eyebrow">Loved by families</p>
          <h2>The moment it clicks</h2>
          <p>Early notes from the families who&apos;ve read our books.</p>
        </div>
        <div className="quotes-grid">
          <figure className="quote-card">
            <blockquote>
              She loves it. They&apos;re amazing. Thank you!!!
            </blockquote>
            <figcaption>
              <span className="quote-name">A dad in Minnesota</span>
              <span className="quote-detail">on his daughter&apos;s custom book</span>
            </figcaption>
          </figure>
          {/*
            Two more quote cards go here once real family quotes are ready.
            Copy the figure block above and replace the blockquote + names.
            Saved templates (paste back in and fill the brackets):

            <figure className="quote-card">
              <blockquote>[Your second family quote goes here.]</blockquote>
              <figcaption>
                <span className="quote-name">Family name</span>
                <span className="quote-detail">on their child's book</span>
              </figcaption>
            </figure>

            <figure className="quote-card">
              <blockquote>[Your third family quote goes here.]</blockquote>
              <figcaption>
                <span className="quote-name">Family name</span>
                <span className="quote-detail">on their child's book</span>
              </figcaption>
            </figure>
          */}
        </div>
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
            <summary>Is this decodable, or just &ldquo;leveled&rdquo;?</summary>
            <p>
              Decodable. Words are restricted to the phonics patterns taught
              by that level, plus a small, tracked set of high-frequency
              &ldquo;heart words.&rdquo; Illustrations support meaning, but
              your child reads the words &mdash; not the picture.{" "}
              <Link href="/reading-approach">See how we choose every word &rarr;</Link>
            </p>
          </details>
          <details>
            <summary>What&apos;s your evidence it works?</summary>
            <p>
              We don&apos;t claim proven outcomes. We build on
              structured-literacy principles and publish our method &mdash;
              the skills matrix, the word-choice rules, even the word list at
              the back of every book &mdash; so you can judge it yourself.
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
            <summary>How does the quarterly reading club work?</summary>
            <p>
              Each season we ship a set of three new personalized paperbacks
              featuring your child. Before each set, we check in on how the reading
              is going and match the next books to your child&apos;s level and
              current interests &mdash; so the books grow with your reader at their
              own pace, not on a fixed schedule. Your first season is $89 &mdash;
              the same as our one-time set of three &mdash; and every season after
              is $69. You can cancel any time from your receipt email.
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
            <summary>What are Parent Read-Along Lines?</summary>
            <p>
              An optional feature you can turn on when you order &mdash; it&apos;s
              off by default and free. Each page gets a second line, smaller and in
              italics, for a grown-up to read aloud, with richer words and a fuller
              story. Your child still reads their own simple line at their level.
              It&apos;s a gentle way to support reading comprehension while they
              build their decoding skills. <Link href="/reading-approach">Learn how it works &rarr;</Link>
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
