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
          It only takes a few minutes &mdash; and you&apos;ll get a preview
          before anything ships. Required fields are marked with an asterisk (*).
        </p>
        <ul className="order-reassure" aria-label="Why