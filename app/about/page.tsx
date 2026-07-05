import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "About us",
  description: "Why we started CustomLearnToRead - and the book that finally got our son to read.",
};

export default function AboutPage() {
  return (
    <>
      <section className="about-hero">
        <p className="eyebrow">About us</p>
        <h1>The book that finally got him to read.</h1>
        <p className="lede">
          We&apos;re a small family making personalized books for kids learning
          to read. Here&apos;s why.
        </p>
      </section>

      <section className="about-photo">
        <Image
          src="/family.jpg"
          width={1600}
          height={1200}
          alt="Our family at the hockey rink"
          className="family-photo"
          priority
        />
        <p className="photo-caption">
          Us at the rink &mdash; where we spend most weekends. Two hockey players in the bunch. (Our goldendoodle was not invited.)
        </p>
      </section>

      <section className="about-story">
        <div className="story-body">
          <p>
            My son was learning to read. The books we brought home were
            technically right &mdash; but he didn&apos;t care.
          </p>
          <p>
            Bedtime was a different story. Every night we&apos;d make up little
            adventures about the things he loved most &mdash; hockey, our dog,
            dinosaurs, whatever was living in his imagination that week. He
            was locked in.
          </p>
          <p>
            One night, after another failed sight-words session, it hit me:
            what if the story he needed wasn&apos;t just simple enough to read
            &mdash; what if it was personal enough to matter?
          </p>
          <p>
            So we made him a book about himself. His name, his world, the
            things he loved on every page.
          </p>
          <p>
            He read it proudly. Then he read it again. Then he read it to
            anyone who walked through our door.
          </p>
          <p className="story-close">
            <strong>That&apos;s why we made this</strong> &mdash; to help kids
            fall in love with books by seeing themselves inside the story.
          </p>
        </div>
      </section>

      <section className="about-values">
        <div className="values-grid">
          <article>
            <h3>Personal, not just printed.</h3>
            <p>Every story is built around the things your child actually loves &mdash; not just a name swap.</p>
          </article>
          <article>
            <h3>Simple words. Big text.</h3>
            <p>Made for beginning readers. Confidence comes before challenge. Prefer to read together? You can add optional grown-up read-along lines to any book.</p>
          </article>
          <article>
            <h3>One family at a time.</h3>
            <p>Made by a family of five in Minnesota - between hockey practices. We read every email and care about every kid.</p>
          </article>
        </div>
      </section>

      <section className="about-cta">
        <h2>Ready to make one for your reader?</h2>
        <Link className="button primary" href="/order">
          Create my book
        </Link>
      </section>
    </>
  );
}
