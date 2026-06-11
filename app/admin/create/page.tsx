import { listOrders, airtableConfigured, type AirtableOrder } from "@/lib/airtable";
import CreateClient from "./CreateClient";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Create a book — Admin",
  robots: { index: false, follow: false },
};

export default async function CreatePage() {
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
  return <CreateClient initialOrders={orders} loadError={loadError} />;
}
