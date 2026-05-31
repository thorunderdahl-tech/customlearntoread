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

        <div className="hero-books" aria-label="Three sample personalized book covers">
          {/* Book 1 — Mia Plays Soccer, Level 1 */}
          <article className="book book-1">
            <span className="book-label">Reading Level 1</span>
            <div className="book-art" aria-hidden="true">
              <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <rect x="0" y="80" width="100" height="20" fill="#7da06a" opacity="0.55" />
                <rect x="36" y="48" width="28" height="30" rx="5" fill="#d65a3e" />
                <text x="50" y="68" fontSize="12" fontWeight="900" fill="#fff" textAnchor="middle">7</text>
                <circle cx="50" cy="34" r="13" fill="#b88563" />
                <path d="M37 30 Q36 16 50 14 Q64 16 63 30 Q60 22 54 22 Q56 26 50 26 Q44 26 46 22 Q40 22 37 30 Z" fill="#241510" />
                <circle cx="45" cy="35" r="1.6" fill="#0d0905" />
                <circle cx="55" cy="35" r="1.6" fill="#0d0905" />
                <path d="M45 40 Q50 43 55 40" stroke="#3a1d10" strokeWidth="1.4" fill="none" strokeLinecap="round" />
                <rect x="40" y="78" width="6" height="14" rx="2" fill="#3a2818" />
                <rect x="54" y="78" width="6" height="14" rx="2" fill="#3a2818" />
                <circle cx="82" cy="86" r="10" fill="#fff" stroke="#1a1a1a" strokeWidth="1.4" />
                <polygon points="82,78 87,83 85,89 79,89 77,83" fill="#1a1a1a" />
              </svg>
            </div>
            <h3>Mia Plays Soccer</h3>
          </article>

          {/* Book 2 — Odin and His Best Dog, Level 2 */}
          <article className="book book-2">
            <span className="book-label">Reading Level 2</span>
            <div className="book-art" aria-hidden="true">
              <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <rect x="0" y="86" width="100" height="14" fill="#b8c8ad" opacity="0.55" />
                <rect x="20" y="48" width="26" height="34" rx="5" fill="#5b3a8a" />
                <text x="33" y="68" fontSize="6" fontWeight="900" fill="#f7d58b" textAnchor="middle">MN</text>
                <circle cx="33" cy="34" r="13" fill="#f1d4b6" />
                <path d="M21 30 Q22 16 33 14 Q44 14 45 28 Q42 22 35 22 Q30 24 26 25 Q23 24 21 30 Z" fill="#dcb572" />
                <circle cx="29" cy="35" r="1.5" fill="#0d0905" />
                <circle cx="37" cy="35" r="1.5" fill="#0d0905" />
                <path d="M28 40 Q33 43 38 40" stroke="#3a1d10" strokeWidth="1.4" fill="none" strokeLinecap="round" />
                <rect x="24" y="82" width="6" height="10" rx="2" fill="#1c1c1c" />
                <rect x="38" y="82" width="6" height="10" rx="2" fill="#1c1c1c" />
                <ellipse cx="74" cy="74" rx="20" ry="12" fill="#e6c89a" />
                <circle cx="62" cy="70" r="6" fill="#e6c89a" />
                <circle cx="86" cy="70" r="6" fill="#e6c89a" />
                <circle cx="74" cy="66" r="6" fill="#e6c89a" />
                <ellipse cx="88" cy="58" rx="10" ry="9" fill="#d4b27e" />
                <ellipse cx="80" cy="52" rx="4" ry="6" fill="#a8814a" />
                <ellipse cx="96" cy="52" rx="4" ry="6" fill="#a8814a" />
                <circle cx="85" cy="58" r="1.1" fill="#0d0905" />
                <circle cx="91" cy="58" r="1.1" fill="#0d0905" />
                <ellipse cx="88" cy="62" rx="1.8" ry="1.2" fill="#0d0905" />
                <rect x="62" y="82" width="4" height="8" rx="2" fill="#b89060" />
                <rect x="82" y="82" width="4" height="8" rx="2" fill="#b89060" />
              </svg>
            </div>
            <h3>Odin and His Best Dog</h3>
          </article>

          {/* Book 3 — Sam Can Read, Level 3, wheelchair */}
          <article className="book book-3">
            <span className="book-label">Reading Level 3</span>
            <div className="book-art" aria-hidden="true">
              <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 18 L16 24 L22 24 L17 28 L19 34 L14 30 L9 34 L11 28 L6 24 L12 24 Z" fill="#f7d58b" />
                <path d="M86 18 L88 24 L94 24 L89 28 L91 34 L86 30 L81 34 L83 28 L78 24 L84 24 Z" fill="#f7d58b" />
                <path d="M85 50 L86.5 53.5 L90 54 L87.5 56.5 L88 60 L85 58 L82 60 L82.5 56.5 L80 54 L83.5 53.5 Z" fill="#f5b78d" />
                <rect x="36" y="40" width="28" height="22" rx="5" fill="#3a8aa8" />
                <circle cx="50" cy="28" r="12" fill="#5a3520" />
                <path d="M38 25 Q39 14 50 13 Q61 14 62 25 Q58 22 50 22 Q42 22 38 25 Z" fill="#1a120c" />
                <circle cx="46" cy="29" r="2.2" fill="#fff" />
                <circle cx="54" cy="29" r="2.2" fill="#fff" />
                <circle cx="46" cy="29" r="1.1" fill="#0d0905" />
                <circle cx="54" cy="29" r="1.1" fill="#0d0905" />
                <path d="M44 34 Q50 39 56 34 Q50 38 44 34 Z" fill="#a01030" />
                <path d="M30 56 L70 56 L70 72 L50 70 L30 72 Z" fill="#fff" stroke="#3a2418" strokeWidth="1.2" />
                <line x1="50" y1="56" x2="50" y2="70" stroke="#3a2418" strokeWidth="1" />
                <line x1="35" y1="60" x2="46" y2="60" stroke="#999" strokeWidth="0.7" />
                <line x1="35" y1="63" x2="46" y2="63" stroke="#999" strokeWidth="0.7" />
                <line x1="35" y1="66" x2="46" y2="66" stroke="#999" strokeWidth="0.7" />
                <line x1="54" y1="60" x2="65" y2="60" stroke="#999" strokeWidth="0.7" />
                <line x1="54" y1="63" x2="65" y2="63" stroke="#999" strokeWidth="0.7" />
                <line x1="54" y1="66" x2="65" y2="66" stroke="#999" strokeWidth="0.7" />
                <line x1="34" y1="68" x2="28" y2="84" stroke="#222" strokeWidth="2.2" strokeLinecap="round" />
                <line x1="66" y1="68" x2="72" y2="84" stroke="#222" strokeWidth="2.2" strokeLinecap="round" />
                <line x1="28" y1="84" x2="72" y2="84" stroke="#222" strokeWidth="2.2" strokeLinecap="round" />
                <circle cx="28" cy="88" r="9" fill="none" stroke="#222" strokeWidth="2.2" />
                <circle cx="28" cy="88" r="2.6" fill="#222" />
                <circle cx="72" cy="88" r="9" fill="none" stroke="#222" strokeWidth="2.2" />
                <circle cx="72" cy="88" r="2.6" fill="#222" />
              </svg>
            </div>
            <h3>Sam Can Read</h3>
          </article>
        </div>
      </section>

      <p className="books-caption">
        Big text. Simple words. Their favorite thing.
      </p>

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
            <summary>Can I include a favorite sport, pet, or stuffed animal?</summary>
            <p>
              Yes. Favorite activities, pets, stuffed animals, family members,
              colors, and numbers are exactly what make the book exciting.
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
              Most one-time orders ship within 7-10 business days. Digital PDFs
              are emailed within 5 business days.
            </p>
          </details>
        </div>
      </section>
    </>
  );
}
