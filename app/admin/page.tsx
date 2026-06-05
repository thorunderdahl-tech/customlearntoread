import { listOrders, airtableConfigured, type AirtableOrder } from "@/lib/airtable";
import AdminDashboard from "./AdminDashboard";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Admin — CustomLearnToRead",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  let orders: AirtableOrder[] = [];
  let loadError: string | null = null;

  if (!airtableConfigured()) {
    loadError = "Airtable isn't configured (missing API key or base ID).";
  } else {
    try {
      orders = await listOrders();
    } catch (e: any) {
      loadError = e?.message || "Failed to load orders from Airtable.";
    }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: ADMIN_CSS }} />
      <AdminDashboard initialOrders={orders} loadError={loadError} />
    </>
  );
}

const ADMIN_CSS = `
  .admin-wrap { max-width: 1200px; margin: 0 auto; padding: 32px 20px 64px; }
  .admin-topbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 8px; }
  .admin-topbar h1 { margin: 0; font-size: 1.7rem; color: var(--ink, #2f2a24); }
  .admin-topbar .sub { color: var(--muted, #7a7164); margin: 2px 0 0; font-size: 0.92rem; }
  .admin-btn { border: 1px solid var(--line, #e7e0d4); background: #fff; color: var(--ink, #2f2a24); border-radius: 999px; padding: 9px 16px; font-weight: 700; font-size: 0.9rem; cursor: pointer; text-decoration: none; display: inline-block; }
  .admin-btn:hover { background: #faf6ee; }
  .admin-btn-dark { background: var(--ink, #2f2a24); color: #fff; border-color: var(--ink, #2f2a24); }

  .admin-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px; margin: 22px 0; }
  .stat-card { background: #fff; border: 1px solid var(--line, #e7e0d4); border-radius: 16px; padding: 16px 18px; }
  .stat-card .num { font-size: 1.7rem; font-weight: 800; color: var(--ink, #2f2a24); line-height: 1.1; }
  .stat-card .lbl { color: var(--muted, #7a7164); font-size: 0.82rem; font-weight: 600; margin-top: 4px; }

  .admin-toolbar { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-bottom: 14px; }
  .admin-toolbar input, .admin-toolbar select { border: 1px solid var(--line, #e7e0d4); border-radius: 12px; padding: 10px 12px; font-size: 0.95rem; background: #fff; }
  .admin-toolbar .search { flex: 1; min-width: 200px; }
  .admin-toolbar .spacer { flex: 1; }

  .admin-table-wrap { background: #fff; border: 1px solid var(--line, #e7e0d4); border-radius: 16px; overflow-x: auto; }
  .admin-table { width: 100%; border-collapse: collapse; font-size: 0.92rem; }
  .admin-table th { text-align: left; padding: 12px 14px; color: var(--muted, #7a7164); font-size: 0.76rem; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 1px solid var(--line, #e7e0d4); white-space: nowrap; }
  .admin-table td { padding: 12px 14px; border-bottom: 1px solid #f1ece2; vertical-align: middle; }
  .admin-table tr:last-child td { border-bottom: 0; }
  .admin-table tr:hover td { background: #fdfaf4; }
  .admin-table .child { font-weight: 700; color: var(--ink, #2f2a24); }
  .admin-table .muted { color: var(--muted, #7a7164); }

  .status-select { border: 1px solid var(--line, #e7e0d4); border-radius: 999px; padding: 6px 10px; font-size: 0.82rem; font-weight: 700; background: #fff; cursor: pointer; }
  .status-select[data-s="Pending payment"] { background: #fdf1e3; color: #8c5b37; }
  .status-select[data-s="Paid"] { background: #eaf3e6; color: #3f6b39; }
  .status-select[data-s="Designing"], .status-select[data-s="Printing"] { background: #eef0f7; color: #3a4a8c; }
  .status-select[data-s="Shipped"] { background: #e6f1f3; color: #2f6d7a; }
  .status-select[data-s="Delivered"] { background: #e9f7ea; color: #2f7a3a; }
  .status-select[data-s="Cancelled"] { background: #f7eaea; color: #8c3737; }

  .admin-empty { text-align: center; padding: 48px 20px; color: var(--muted, #7a7164); }
  .admin-error { background: #fdeceb; border: 1px solid #f3c6c2; color: #8c3737; border-radius: 14px; padding: 14px 16px; margin-bottom: 16px; font-size: 0.92rem; }

  .order-modal-bg { position: fixed; inset: 0; background: rgba(47,42,36,0.45); display: flex; align-items: flex-start; justify-content: center; padding: 40px 16px; z-index: 1000; overflow-y: auto; }
  .order-modal { background: #fff; border-radius: 20px; max-width: 720px; width: 100%; padding: 26px 28px 32px; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
  .order-modal-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 6px; }
  .order-modal-head h2 { margin: 0; font-size: 1.4rem; color: var(--ink, #2f2a24); }
  .order-modal-close { border: 0; background: #f1ece2; border-radius: 999px; width: 34px; height: 34px; font-size: 1.1rem; cursor: pointer; line-height: 1; }
  .detail-section { margin-top: 18px; }
  .detail-section h3 { font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.08em; color: #8c5b37; margin: 0 0 8px; }
  .detail-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px 22px; }
  .detail-row { display: grid; gap: 1px; }
  .detail-row .k { font-size: 0.74rem; color: var(--muted, #7a7164); font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
  .detail-row .v { color: var(--ink, #2f2a24); font-size: 0.95rem; white-space: pre-wrap; }
  .photo-grid { display: flex; flex-wrap: wrap; gap: 10px; }
  .photo-grid a { display: block; }
  .photo-grid img { width: 92px; height: 92px; object-fit: cover; border-radius: 12px; border: 1px solid var(--line, #e7e0d4); }
`;
