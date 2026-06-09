export const metadata = {
  title: "Checkout canceled | CustomLearnToRead",
};

export default function CancelPage() {
  return (
    <div className="center-narrow">
      <p className="eyebrow">Checkout canceled</p>
      <h1>No worries — nothing was charged.</h1>
      <p>
        Good news: everything you entered is still saved on the order form.
        Head back any time and pick up exactly where you left off.
      </p>
      <p style={{ marginTop: 24 }}>
        <a className="button primary" href="/order">
          Pick up where I left off
        </a>{" "}
        <a className="button secondary" href="/">
          Home
        </a>
      </p>
    </div>
  );
}
