import { Suspense } from "react";
import OrderForm from "./OrderForm";

export const metadata = {
  title: "Start your custom book | CustomLearnToRead",
};

export default function OrderPage() {
  return (
    <section className="section form-section">
      <div className="section-heading">
        <p className="eyebrow">Order</p>
        <h2>Tell us about your reader</h2>
        <p>
          We use these details to create their custom characters and stories.
          It only takes a few minutes &mdash; and we personally review every
          page before anything ships. Required fields are marked with an asterisk (*).
        </p>
        <ul className="order-reassure" aria-label="Why families trust us">
          <li><span aria-hidden="true">&#10004;</span> Every page reviewed before it ships</li>
          <li><span aria-hidden="true">&#128230;</span> Free US shipping</li>
          <li><span aria-hidden="true">&#8617;</span> Love-it guarantee</li>
        </ul>
      </div>
      <Suspense
        fallback={
          <div className="form-loading">
            <span className="spinner" aria-hidden="true" />
            Loading your order form&hellip;
          </div>
        }
      >
        <OrderForm />
      </Suspense>
    </section>
  );
}
