import Link from "next/link";

export const metadata = {
  title: "Our Guarantee & Returns | CustomLearnToRead",
  description:
    "Our happiness promise and return policy for personalized, made-to-order books.",
};

export default function GuaranteePage() {
  return (
    <div className="center-narrow">
      <p className="eyebrow">Our promise</p>
      <h1>The love-it guarantee.</h1>
      <p>
        Every book is made from scratch for one child &mdash; so if anything
        isn&apos;t right, we&apos;ll make it right. Here&apos;s exactly what that
        means.
      </p>

      <h2>&#9989; If we make a mistake, we&apos;ll fix it.</h2>
      <p>
        If your book arrives with a printing defect, shipping damage, or an error
        on our end (like a misspelled name, incorrect personalization, or a
        printing issue), let us know within 30 days.
      </p>
      <p>
        Email a photo of the issue to{" "}
        <a href="mailto:customlearntoread@gmail.com">customlearntoread@gmail.com</a>,
        and we&apos;ll replace your book at no cost.
      </p>

      <h2>&#10084;&#65039; If it doesn&apos;t feel quite right, reach out.</h2>
      <p>
        Because every child is different, sometimes a story or reading level
        isn&apos;t exactly what you expected. If you contact us within 30 days,
        we&apos;ll work with you on a solution.
      </p>
      <ul>
        <li>
          <strong>Digital books:</strong> We&apos;ll revise your book and send an
          updated copy.
        </li>
        <li>
          <strong>Printed books:</strong> We&apos;ll review the situation together
          and, when appropriate, offer a revision, replacement, or another fair
          solution.
        </li>
      </ul>
      <p>
        Our goal isn&apos;t just to deliver a book &mdash; it&apos;s to create one
        your child will love.
      </p>

      <h2>&#128214; Why personalized books can&apos;t be returned.</h2>
      <p>
        Every book is created exclusively for one child using their name,
        appearance, interests, and other personalized details. Because of that,
        personalized books can&apos;t be restocked or resold, so we can&apos;t
        accept returns or exchanges simply because you&apos;ve changed your mind.
      </p>
      <p>But if the mistake is ours, we&apos;ll always make it right.</p>

      <h2>&#127912; Every book is truly one of a kind.</h2>
      <p>
        Every illustration is custom created. Small artistic differences &mdash;
        such as slight color variations or an artist&apos;s interpretation of your
        child&apos;s details &mdash; are part of the creative process and
        aren&apos;t considered defects.
      </p>

      <h2>&#128274; Your privacy matters.</h2>
      <p>
        The information you provide is used only to create your book. Any photos
        you upload are permanently deleted after your first book has been
        delivered. See our <Link href="/privacy">Privacy Policy</Link> for more.
      </p>
    </div>
  );
}
