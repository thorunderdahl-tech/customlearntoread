"use client";

import { useMemo, useState } from "react";
import { FULFILLMENT_STATUSES, type AirtableOrder } from "@/lib/airtable";

type Props = { initialOrders: AirtableOrder[]; loadError: string | null };

function field(o: AirtableOrder, key: string): string {
  const v = o.fields?.[key];
  return v == null ? "" : String(v);
}

function fmtDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function parseAmount(s: string): number {
  const n = Number(s.replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
}

function splitUrls(s: string): string[] {
  return s.split(/\s+/).map((x) => x.trim()).filter((x) => /^https?:\/\//.test(x));
}

export default function AdminDashboard({ initialOrders, loadError }: Props) {
  const [orders, setOrders] = useState<AirtableOrder[]>(initialOrders);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selected, setSelected] = useState<AirtableOrder | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== "All" && field(o, "Status") !== statusFilter) return false;
      if (!q) return true;
      const hay = [
        field(o, "Child name"),
        field(o, "Parent name"),
        field(o, "Parent email"),
        field(o, "Product"),
        field(o, "Theme 1"),
        field(o, "Theme 2"),
        field(o, "Theme 3"),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [orders, query, statusFilter]);

  const stats = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    let paid = 0,
      production = 0,
      fulfilled = 0,
      revenue = 0,
      thisWeek = 0;
    for (const o of orders) {
      const s = field(o, "Status");
      if (s === "Paid") paid++;
      if (s === "Designing" || s === "Printing") production++;
      if (s === "Shipped" || s === "Delivered") fulfilled++;
      if (s !== "Pending payment" && s !== "Cancelled") revenue += parseAmount(field(o, "Amount"));
      if (new Date(o.createdTime).getTime() >= weekAgo) thisWeek++;
    }
    return { total: orders.length, paid, production, fulfilled, revenue, thisWeek };
  }, [orders]);

  async function changeStatus(o: AirtableOrder, status: string) {
    setSavingId(o.id);
    setRowError(null);
    const prev = field(o, "Status");
    // optimistic
    setOrders((cur) =>
      cur.map((x) => (x.id === o.id ? { ...x, fields: { ...x.fields, Status: status } } : x)),
    );
    try {
      const res = await fetch(`/api/admin/orders`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: o.id, status }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Update failed");
      }
    } catch (e: any) {
      // revert
      setOrders((cur) =>
        cur.map((x) => (x.id === o.id ? { ...x, fields: { ...x.fields, Status: prev } } : x)),
      );
      setRowError(`Couldn't update ${field(o, "Child name") || "order"}: ${e?.message || e}`);
    }
    setSavingId(null);
  }

  async function logout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    window.location.href = "/admin/login";
  }

  function exportCsv() {
    const cols = [
      "Date",
      "Status",
      "Product",
      "Amount",
      "Child name",
      "Age",
      "Reading level",
      "Pronouns",
      "Parent name",
      "Parent email",
      "Hair",
      "Eyes",
      "Skin tone",
      "Glasses / accessories",
      "Clothing",
      "Look notes",
      "Theme 1",
      "Theme 2",
      "Theme 3",
      "Special details",
      "Shipping address",
      "Other notes",
      "Reference photos",
      "Theme photos",
      "Stripe ID",
    ];
    const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [cols.map(esc).join(",")];
    for (const o of filtered) {
      const row = cols.map((c) => esc(c === "Date" ? fmtDate(o.createdTime) : field(o, c)));
      lines.push(row.join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customlearntoread-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="admin-wrap">
      <div className="admin-topbar">
        <div>
          <h1>Orders</h1>
          <p className="sub">Manage and fulfill customer orders.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a className="admin-btn" href="/admin/review">Review queue</a>
          <button className="admin-btn" onClick={() => window.location.reload()}>
            Refresh
          </button>
          <button className="admin-btn" onClick={exportCsv} disabled={!filtered.length}>
            Export CSV
          </button>
          <button className="admin-btn admin-btn-dark" onClick={logout}>
            Sign out
          </button>
        </div>
      </div>

      {loadError && <div className="admin-error">{loadError}</div>}
      {rowError && <div className="admin-error">{rowError}</div>}

      <div className="admin-stats">
        <div className="stat-card">
          <div className="num">{stats.total}</div>
          <div className="lbl">Total orders</div>
        </div>
        <div className="stat-card">
          <div className="num">{stats.paid}</div>
          <div className="lbl">Paid · ready to start</div>
        </div>
        <div className="stat-card">
          <div className="num">{stats.production}</div>
          <div className="lbl">In production</div>
        </div>
        <div className="stat-card">
          <div className="num">{stats.fulfilled}</div>
          <div className="lbl">Shipped / delivered</div>
        </div>
        <div className="stat-card">
          <div className="num">{stats.thisWeek}</div>
          <div className="lbl">New this week</div>
        </div>
        <div className="stat-card">
          <div className="num">${stats.revenue.toFixed(2)}</div>
          <div className="lbl">Revenue (paid)</div>
        </div>
      </div>

      <div className="admin-toolbar">
        <input
          className="search"
          type="search"
          placeholder="Search child, parent, email, theme…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="All">All statuses</option>
          {FULFILLMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <span className="admin-btn" style={{ cursor: "default", background: "#faf6ee" }}>
          {filtered.length} shown
        </span>
      </div>

      <div className="admin-table-wrap">
        {filtered.length === 0 ? (
          <div className="admin-empty">No orders match.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Child</th>
                <th>Parent</th>
                <th>Product</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => {
                const status = field(o, "Status");
                return (
                  <tr key={o.id}>
                    <td className="muted">{fmtDate(o.createdTime)}</td>
                    <td className="child">{field(o, "Child name") || "—"}</td>
                    <td>
                      <div>{field(o, "Parent name")}</div>
                      <div className="muted" style={{ fontSize: "0.82rem" }}>
                        {field(o, "Parent email")}
                      </div>
                    </td>
                    <td>{field(o, "Product")}</td>
                    <td>
                      <select
                        className="status-select"
                        data-s={status}
                        value={status || "Pending payment"}
                        disabled={savingId === o.id}
                        onChange={(e) => changeStatus(o, e.target.value)}
                      >
                        {FULFILLMENT_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button className="admin-btn" onClick={() => setSelected(o)}>
                        View
                      </button>{" "}
                      <a
                        className="admin-btn"
                        href={`/admin/deliver?recordId=${o.id}&child=${encodeURIComponent(field(o, "Child name") || "")}&email=${encodeURIComponent(field(o, "Parent email") || "")}`}
                      >
                        Deliver
                      </a>{" "}
                      <a className="admin-btn" href={`/admin/create?recordId=${o.id}`}>
                        Create
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {selected && <OrderModal order={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  if (!v) return null;
  return (
    <div className="detail-row">
      <span className="k">{k}</span>
      <span className="v">{v}</span>
    </div>
  );
}

function OrderModal({ order, onClose }: { order: AirtableOrder; onClose: () => void }) {
  const refPhotos = splitUrls(field(order, "Reference photos"));
  const themePhotos = splitUrls(field(order, "Theme photos"));
  return (
    <div className="order-modal-bg" onClick={onClose}>
      <div className="order-modal" onClick={(e) => e.stopPropagation()}>
        <div className="order-modal-head">
          <h2>{field(order, "Child name") || "Order"}</h2>
          <button className="order-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="detail-section">
          <h3>Order</h3>
          <div className="detail-grid">
            <Row k="Product" v={field(order, "Product")} />
            <Row k="Status" v={field(order, "Status")} />
            <Row k="Amount" v={field(order, "Amount")} />
            <Row k="Date" v={fmtDate(order.createdTime)} />
            <Row k="Stripe ID" v={field(order, "Stripe ID")} />
          </div>
        </div>

        <div className="detail-section">
          <h3>Reader</h3>
          <div className="detail-grid">
            <Row k="Child name" v={field(order, "Child name")} />
            <Row k="Age" v={field(order, "Age")} />
            <Row k="Reading level" v={field(order, "Reading level")} />
            <Row k="Pronouns" v={field(order, "Pronouns")} />
            <Row k="Parent name" v={field(order, "Parent name")} />
            <Row k="Parent email" v={field(order, "Parent email")} />
          </div>
        </div>

        <div className="detail-section">
          <h3>Look</h3>
          <div className="detail-grid">
            <Row k="Hair" v={field(order, "Hair")} />
            <Row k="Eyes" v={field(order, "Eyes")} />
            <Row k="Skin tone" v={field(order, "Skin tone")} />
            <Row k="Glasses / accessories" v={field(order, "Glasses / accessories")} />
            <Row k="Clothing" v={field(order, "Clothing")} />
          </div>
          <Row k="Look notes" v={field(order, "Look notes")} />
        </div>

        <div className="detail-section">
          <h3>Story</h3>
          <div className="detail-grid">
            <Row k="Theme 1" v={field(order, "Theme 1")} />
            <Row k="Theme 2" v={field(order, "Theme 2")} />
            <Row k="Theme 3" v={field(order, "Theme 3")} />
          </div>
          <Row k="Special details" v={field(order, "Special details")} />
        </div>

        {(field(order, "Shipping address") || field(order, "Other notes")) && (
          <div className="detail-section">
            <h3>Shipping & notes</h3>
            <Row k="Shipping address" v={field(order, "Shipping address")} />
            <Row k="Other notes" v={field(order, "Other notes")} />
          </div>
        )}

        {(refPhotos.length > 0 || themePhotos.length > 0) && (
          <div className="detail-section">
            <h3>Photos</h3>
            {refPhotos.length > 0 && (
              <>
                <span className="k" style={{ fontSize: "0.74rem", color: "#7a7164", fontWeight: 700 }}>
                  Reference
                </span>
                <div className="photo-grid" style={{ marginBottom: 12 }}>
                  {refPhotos.map((u, i) => (
                    <a key={i} href={u} target="_blank" rel="noreferrer">
                      <img src={u} alt={`Reference ${i + 1}`} />
                    </a>
                  ))}
                </div>
              </>
            )}
            {themePhotos.length > 0 && (
              <>
                <span className="k" style={{ fontSize: "0.74rem", color: "#7a7164", fontWeight: 700 }}>
                  Theme
                </span>
                <div className="photo-grid">
                  {themePhotos.map((u, i) => (
                    <a key={i} href={u} target="_blank" rel="noreferrer">
                      <img src={u} alt={`Theme ${i + 1}`} />
                    </a>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
