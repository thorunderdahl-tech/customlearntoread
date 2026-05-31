export const metadata = {
  title: "Checkout canceled | CustomLearnToRead",
};

export default function CancelPage() {
  return (
    <div className="center-narrow">
      <p className="eyebrow">Checkout canceled</p>
      <h1>No worries — nothing was charged.</h1>
      <p>
        Your personalization details weren&apos;t saved when you canceled, but
        you can head back and start a new order any time.
      </p>
      <p style={{ marginTop: 24 }}>
        <a className="button primary" href="/order">
          Back to the order form
        </a>{" "}
        <a className="button secondary" href="/">
          Home
        </a>
      </p>
    </div>
  );
}
