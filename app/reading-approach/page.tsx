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
      <p>
        Most personalized books stop at the name on the cover. Ours is built around
        a structured, systematic phonics sequence &mdash; so the story your child
        loves is also a real reading lesson, with every word chosen to be readable
        at their level.
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

      <h2>Why every word is chosen on purpose</h2>
      <p>
        Nothing in the story is random. Every word your child sees was picked
        for a reason, and it falls into one of two groups.
      </p>
      <p>
        <strong>Words to sound out.</strong> These are decodable &mdash; built
        from the letter-sound patterns your child has already been taught at
        their level. They read these by applying what they know, not by
        guessing from the picture.
      </p>
      <p>
        <strong>Words to learn by heart.</strong> A small, tracked set of
        high-frequency words shows up often in children&apos;s books. Most can
        still be sounded out; a few have one irregular spelling that&apos;s
        learned through repeated reading &mdash; what reading researchers call
        &ldquo;heart words.&rdquo;
      </p>
      <p>
        A child&apos;s name and a handful of favorite-things words make the
        story personal without breaking this rule &mdash; the illustrations
        support meaning, but the words do the reading. This is what we mean
        when we say every book is <strong>decodable</strong>: it&apos;s built
        on a structured, systematic phonics scope-and-sequence, in line with
        the <em>Simple View of Reading</em> and the principles of{" "}
        <em>Structured Literacy</em> &mdash; not a leveled-reader tradition
        that leans on picture-guessing.
      </p>
      <p style={{ fontStyle: "italic", color: "var(--muted)" }}>
        We don&apos;t claim proven outcomes. We build on structured-literacy
        principles and publish our method &mdash; the skills matrix below,
        and the practiced-word list at the back of every book &mdash; so you
        can judge it for yourself.
      </p>

      <h2>The research it draws on</h2>
      <p>
        Our method is <em>informed by the science of reading</em> &mdash; the
        large, converging body of research on how children learn to read. Three
        ideas shape every book.
      </p>
      <p>
        <strong>The Simple View of Reading.</strong> Skilled reading is decoding{" "}
        <em>times</em> language comprehension &mdash; you need both, not one or the
        other. Our text is built to practice decoding; the story itself, and the
        optional Parent Read-Along Lines, feed comprehension.
      </p>
      <p>
        <strong>Scarborough&apos;s Reading Rope.</strong> Fluent reading is many
        strands woven together &mdash; phonological awareness, decoding, and
        sight-word recognition on one side; vocabulary, background knowledge, and
        language structure on the other. A personalized story a child cares about
        pulls on both sides at once.
      </p>
      <p>
        <strong>Orthographic mapping.</strong> A word becomes instantly
        recognizable &mdash; a true &ldquo;sight word&rdquo; &mdash; when a reader
        connects its sounds to its spelling, not by memorizing it as a picture.
        That&apos;s why even our heart words are taught by sounding out the regular
        parts and remembering only the one tricky spelling, rather than as
        whole-word flash cards.
      </p>

      <h2>How the levels build</h2>
      <p>
        The four levels are a deliberate ladder from fully decodable text to real
        books, with the support removed a little at a time.
      </p>
      <ul>
        <li>
          <strong>Level 1 &mdash; Tiny Reader.</strong> Short, fully decodable
          sentences built from a tight set of sounds, plus a handful of heart words.
        </li>
        <li>
          <strong>Level 2 &mdash; Beginner Reader.</strong> A wider decodable
          vocabulary and more heart words, still highly repetitive.
        </li>
        <li>
          <strong>Level 3 &mdash; Growing Reader.</strong> Longer sentences and
          trickier patterns &mdash; vowel teams and r-controlled vowels &mdash;
          with a little dialogue.
        </li>
        <li>
          <strong>Level 4 &mdash; Confident Reader.</strong> The decodable
          scaffolding comes off: natural, expressive language that reads like a
          first easy-reader chapter.
        </li>
      </ul>

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
