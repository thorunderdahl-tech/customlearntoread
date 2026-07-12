import { listOrders, airtableConfigured, type AirtableOrder } from "@/lib/airtable";
import ReviewClient from "./ReviewClient";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Review queue — Admin",
  robots: { index: false, follow: false },
};

export default async function ReviewPage() {
  let orders: AirtableOrder[] = [];
  let loadError: string | null = null;
  if (!airtableConfigured()) {
    loadError = "Airtable isn't configured.";
  } else {
    try {
      orders = await listOrders();
    } catch (e: any) {
      loadError = e?.message || "Failed to load orders.";
    }
  }
  return <ReviewClient initialOrders={orders} loadError={loadError} />;
}
