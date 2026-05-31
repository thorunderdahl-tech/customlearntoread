export const metadata = {
  title: "Order received | CustomLearnToRead",
};

export default function SuccessPage() {
  return (
    <div className="center-narrow">
      <p className="eyebrow">Order confirmed</p>
      <h1>You&apos;re all set.</h1>
      <p>
        Thanks so much. Your payment went through and we&apos;ve emailed you a
        receipt with all the details. We&apos;ll get started on your book right
        away.
      </p>
      <h2>What happens next</h2>
      <p>
        For one-time orders, most paperback and hardcover sets ship within 7–10
        business days. Digital PDFs are emailed within about 5 business days.
        If you signed up for the monthly book club, your first book will start
        production immediately and ship as soon as it&apos;s ready.
      </p>
      <h2>Need to change something?</h2>
      <p>
        Just reply to your confirmation email — we read every reply and can
        update names, spelling, themes, or shipping info before printing
        begins.
      </p>
      <p style={{ marginTop: 28 }}>
        <a className="button primary" href="/">
          Back to home
        </a>
      </p>
    </div>
  );
}
