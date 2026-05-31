import Link from "next/link";
import { PRODUCTS } from "@/lib/products";

export default function Home() {
  const oneTime = PRODUCTS.filter((p) => p.cadence === "one_time");
  const sub = PRODUCTS.find((p) => p.cadence === "monthly")!;

  return (
    <>
      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">Personalized books for beginning readers</p>
          <h1>Get early readers excited about books.</h1>
          <p className="subhead">
            Their name. Their look. Their favorite things. A simple
            learn-to-read story made just for them.
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
        <div className="hero-card" aria-label="Sample personalized book card">
          <div className="book-cover">
            <span className="book-label">Reading Level 1</span>
            <h2>Odin Plays Baseball</h2>
            <p>Big text. Simple words. Their favorite thing.</p>
          </div>
        </div>
      </section>

      <section className="promise">
        <h2>About them. For them. At their reading level.</h2>
        <p>
          Beginning readers need confidence, repetition, and a reason to care.
          We make simple personalized stories kids want to read again and
          again.
        </p>
      </section>

      <section id="how" className="section">
        <div className="section-heading">
          <p className="eyebrow">How it works</p>
          <h2>Three simple steps</h2>
        </div>
        <div className="steps-grid">
          <article className="step-card">
            <span className="num">1</span>
            <h3>Tell us about your reader</h3>
            <p>
              Name, appearance, reading level, favorite themes, and any details
              that matter.
            </p>
          </article>
          <article className="step-card">
            <span className="num">2</span>
            <h3>We make the story personal</h3>
            <p>The words stay simple. The pictures carry the magic.</p>
          </article>
          <article className="step-card">
            <span className="num">3</span>
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
        </div>
        <div className="pricing-grid">
          {oneTime.map((p) => (
            <article
              key={p.id}
              className={`price-card${p.popular ? " popular" : ""}`}
            >
              {p.popular && <p className="badge">Most popular</p>}
              <h3>{p.name}</h3>
              <p className="price">{p.priceLabel}</p>
              <p>{p.blurb}</p>
            </article>
          ))}
        </div>
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
              themselves — new themes, new adventures, same simple words that
              build confidence.
            </p>
            <ul>
              <li>1 new personalized paperback per month</li>
              <li>Themes refresh — and reading level grows with them</li>
              <li>Free shipping in the US</li>
              <li>Pause or cancel any time</li>
            </ul>
          </div>
          <div className="price-tag">
            <p className="big-price">{sub.priceLabel}</p>
            <p className="per">billed monthly</p>
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
        </div>
        <div className="levels-grid">
          <article>
            <h3>Level 1</h3>
            <p>One short sentence per page. Repetition. Very simple words.</p>
          </article>
          <article>
            <h3>Level 2</h3>
            <p>Slightly longer patterns. More familiar action words.</p>
          </article>
          <article>
            <h3>Level 3</h3>
            <p>Simple story arc with more variety and practice words.</p>
          </article>
          <article>
            <h3>Level 4</h3>
            <p>More confident early-reader text with short paragraphs.</p>
          </article>
        </div>
      </section>

      <section id="faq" className="section">
        <div className="section-heading">
          <p className="eyebrow">FAQ</p>
          <h2>Common questions</h2>
        </div>
        <div className="faq-list">
          <details>
            <summary>Can I include a favorite sport or pet?</summary>
            <p>
              Yes. Favorite activities, pets, family members, colors, and
              numbers are exactly what make the book exciting.
            </p>
          </details>
          <details>
            <summary>Can you use licensed characters?</summary>
            <p>
              No. We avoid trademarked characters, logos, and copyrighted
              worlds. We can create an original story inspired by a child's
              interests.
            </p>
          </details>
          <details>
            <summary>How does the monthly book club work?</summary>
            <p>
              Each month we ship a new personalized paperback book featuring
              your child. You're billed monthly and can pause or cancel any
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
              Most one-time orders ship within 7–10 business days. Digital PDFs
              are emailed within 5 business days.
            </p>
          </details>
        </div>
      </section>
    </>
  );
}
