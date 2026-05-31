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
          Required fields are marked with *.
        </p>
      </div>
      <Suspense fallback={<p style={{ textAlign: "center" }}>Loading…</p>}>
        <OrderForm />
      </Suspense>
    </section>
  );
}
