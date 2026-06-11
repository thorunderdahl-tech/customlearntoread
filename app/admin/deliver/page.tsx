import { Suspense } from "react";
import DeliverClient from "./DeliverClient";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Deliver a book — Admin",
  robots: { index: false, follow: false },
};

export default function DeliverPage() {
  return (
    <Suspense>
      <DeliverClient />
    </Suspense>
  );
}
