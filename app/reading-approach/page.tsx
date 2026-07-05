import Link from "next/link";
import { SKILLS_MATRIX } from "@/lib/reading/skillsMatrix";

export const metadata = {
  title: "Our reading approach | CustomLearnToRead",
  description:
    "How our books support early reading — decoding and comprehension — and how the optional Parent Read-Along Lines work.",
};

export default function ReadingApproachPage() {
  return (
    <div className="center-narrow">
      <p className="eyebrow">Our reading approach</p>
      <h1>Built for how kids actually learn to read.</h1>
      <p>
        Every book is written at your child&apos;s reading level, with big text,
        simple words, and a hero they recognize as themselves. The goal is
        confidence first &mdash; a child who finishes a whole book on their own and
        wants to read it again.
      </p>

      <h2>Parent Read-Along Lines &mdash; comprehension support for early readers</h2>
      <p>
        Learning to read has two halves. One is <strong>decoding</strong> &mdash;
        sounding out words, which every book we make is carefully built to practice.
        The other is <strong>language comprehension</strong> &mdash; vocabulary,
        ideas, and story. This distinction comes from the <em>Simple View of
        Reading</em>, a long-standing framework in reading research: strong reading
        needs both halves.
      </p>
      <p>
        Here&apos;s the useful part: young children can <em>understand</em> far
        richer language than they can decode on their own. Parent Read-Along Lines
        give each page a second line &mdash; written for a grown-up to read aloud
        &mdash; with bigger words and a fuller story. Your child proudly reads their
        own simple, fully-decodable line; you read yours. They practice sounding
        words out <em>and</em> hear rich language at the same time.
      </p>
      <p>
        We keep it optional, and off by default, because the heart of every book is
        your child reading it themselves. But if you&apos;d like to build vocabulary
        and a love of stories alongside their phonics practice, it&apos;s a lovely
        way to do it &mdash; especially for the earliest levels, where a child&apos;s
        own text is necessarily simple. You can add it when you order, and it never
        changes the words your child reads.
      </p>

      <h2>What each level teaches</h2>
      <p>
        Our levels aren&apos;t just labels. Each one introduces specific reading
        skills and gives the child books that practice them, so progress is
        deliberate — not accidental.
      </p>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.95rem", marginTop: 8 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "8px 10px", borderBottom: "2px solid var(--muted)" }}>Skill</th>
              <th style={{ textAlign: "left", padding: "8px 10px", borderBottom: "2px solid var(--muted)" }}>Introduced</th>
              <th style={{ textAlign: "left", padding: "8px 10px", borderBottom: "2px solid var(--muted)" }}>Mastered</th>
            </tr>
          </thead>
          <tbody>
            {SKILLS_MATRIX.map((s) => (
              <tr key={s.skill}>
                <td style={{ padding: "8px 10px", borderBottom: "1px solid #eadccb" }}>{s.skill}</td>
                <td style={{ padding: "8px 10px", borderBottom: "1px solid #eadccb" }}>{s.introduced}</td>
                <td style={{ padding: "8px 10px", borderBottom: "1px solid #eadccb" }}>{s.mastered}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: 28 }}>
        <Link className="button primary" href="/order">
          Create my book
        </Link>
      </p>
    </div>
  );
}
